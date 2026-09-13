import FeeStructure from '../models/FeeStructure.js';
import FeeDemand from '../models/FeeDemand.js';
import LateFeeRule from '../models/LateFeeRule.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import CautionMoney from '../models/CautionMoney.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Receipt from '../models/Receipt.js';
import AuditLog from '../models/AuditLog.js';
import { getSession } from '../config/db.js';
import { settleFeePayment } from '../services/ledger.service.js';
import { issueReceipt } from '../services/receipt.service.js';
import { postDoubleEntry } from '../services/ledger.service.js';

// ─── DASHBOARD ────────────────────────────────────────────────────────────

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents, totalDemands, totalPaid, totalOutstanding,
      recentTransactions, overdueCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      FeeDemand.countDocuments(),
      FeeDemand.aggregate([{ $group: { _id: null, total: { $sum: '$totalPaid' } } }]),
      FeeDemand.aggregate([{ $group: { _id: null, total: { $sum: '$outstandingAmount' } } }]),
      Transaction.find({ status: 'captured' }).sort({ capturedAt: -1 }).limit(10)
        .populate('student', 'name rollNumber')
        .populate('demand', 'semester academicYear'),
      FeeDemand.countDocuments({ status: 'overdue' }),
    ]);

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalDemands,
        totalPaid: totalPaid[0]?.total || 0,
        totalOutstanding: totalOutstanding[0]?.total || 0,
        overdueCount,
        recentTransactions,
        collectionRate: totalPaid[0]?.total && (totalPaid[0]?.total + (totalOutstanding[0]?.total || 0)) > 0
          ? Math.round((totalPaid[0].total / (totalPaid[0].total + (totalOutstanding[0].total || 0))) * 100)
          : 0,
      },
    });
  } catch (err) { next(err); }
};

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────

export const getDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find({ isActive: true });
    return res.json({ success: true, data: depts });
  } catch (err) { next(err); }
};

// ─── FEE STRUCTURES ───────────────────────────────────────────────────────

export const getFeeStructures = async (req, res, next) => {
  try {
    const { department, semester, batch, academicYear } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);
    if (batch) filter.batch = batch;
    if (academicYear) filter.academicYear = academicYear;

    const structures = await FeeStructure.find(filter)
      .populate('department', 'name code')
      .populate('publishedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: structures });
  } catch (err) { next(err); }
};

export const createFeeStructure = async (req, res, next) => {
  try {
    const components = (req.body.components || []).map(c => ({
      name: c.name,
      amount: Math.round(parseFloat(c.amount) || 0),
      isOptional: Boolean(c.isOptional),
      description: c.description || '',
    }));

    const totalAmount = components.reduce((sum, c) => sum + (c.amount || 0), 0);

    const structureData = {
      ...req.body,
      components,
      totalAmount,
      publishedBy: req.body.isPublished ? req.user._id : undefined,
      publishedAt: req.body.isPublished ? new Date() : undefined,
    };

    const structure = await FeeStructure.create(structureData);

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'create_fee_structure',
      targetEntity: 'FeeStructure',
      targetId: structure._id,
      afterState: structure.toObject(),
      reason: 'New fee structure created',
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: structure });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A fee structure already exists for this Department, Batch, Semester, and Academic Year.',
      });
    }
    next(err);
  }
};

export const updateFeeStructure = async (req, res, next) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) return res.status(404).json({ success: false, message: 'Fee structure not found.' });
    if (structure.isPublished) return res.status(400).json({ success: false, message: 'Published fee structures cannot be modified.' });

    const before = structure.toObject();
    Object.assign(structure, req.body);
    await structure.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'update_fee_structure', targetEntity: 'FeeStructure', targetId: structure._id,
      beforeState: before, afterState: structure.toObject(),
      reason: req.body.reason || 'Fee structure updated', ipAddress: req.ip,
    });

    return res.json({ success: true, data: structure });
  } catch (err) { next(err); }
};

export const publishFeeStructure = async (req, res, next) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) return res.status(404).json({ success: false, message: 'Not found.' });

    structure.isPublished = true;
    structure.publishedAt = new Date();
    structure.publishedBy = req.user._id;
    await structure.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'publish_fee_structure', targetEntity: 'FeeStructure', targetId: structure._id,
      afterState: structure.toObject(), reason: 'Fee structure published', ipAddress: req.ip,
    });

    return res.json({ success: true, data: structure, message: 'Fee structure published.' });
  } catch (err) { next(err); }
};

// ─── LATE FEE RULES ───────────────────────────────────────────────────────

export const getLateFeeRules = async (req, res, next) => {
  try {
    const rules = await LateFeeRule.find({ isActive: true }).populate('feeStructure', 'department batch semester');
    return res.json({ success: true, data: rules });
  } catch (err) { next(err); }
};

export const createLateFeeRule = async (req, res, next) => {
  try {
    const rule = await LateFeeRule.create({ ...req.body, createdBy: req.user._id });
    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'create_late_fee_rule', targetEntity: 'LateFeeRule', targetId: rule._id,
      afterState: rule.toObject(), reason: 'Late fee rule created', ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, data: rule });
  } catch (err) { next(err); }
};

export const updateLateFeeRule = async (req, res, next) => {
  try {
    const rule = await LateFeeRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Late fee rule not found.' });

    const before = rule.toObject();
    Object.assign(rule, req.body);
    await rule.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'update_late_fee_rule', targetEntity: 'LateFeeRule', targetId: rule._id,
      beforeState: before, afterState: rule.toObject(),
      reason: req.body.reason || 'Late fee rule modified', ipAddress: req.ip,
    });

    return res.json({ success: true, data: rule, message: 'Late fee rule updated successfully.' });
  } catch (err) { next(err); }
};

export const deleteLateFeeRule = async (req, res, next) => {
  try {
    const rule = await LateFeeRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Late fee rule not found.' });

    rule.isActive = false;
    await rule.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'deactivate_late_fee_rule', targetEntity: 'LateFeeRule', targetId: rule._id,
      reason: 'Late fee rule deactivated', ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Late fee rule deactivated.' });
  } catch (err) { next(err); }
};

// ─── INSTALLMENT PLANS ────────────────────────────────────────────────────

export const getInstallments = async (req, res, next) => {
  try {
    const plans = await InstallmentPlan.find()
      .populate('student', 'name rollNumber email department')
      .populate('demand', 'semester academicYear totalDemanded outstandingAmount')
      .sort({ createdAt: -1 });
    const validPlans = plans.filter(p => p.student != null);
    return res.json({ success: true, data: validPlans });
  } catch (err) { next(err); }
};

export const createInstallmentPlan = async (req, res, next) => {
  try {
    const { studentId, demandId, name, numberOfInstallments, customSlots } = req.body;
    const student = studentId || req.body.student;
    const demand = demandId || req.body.demand;

    const feeDemand = await FeeDemand.findById(demand);
    if (!feeDemand) return res.status(404).json({ success: false, message: 'Fee Demand not found.' });

    let installments = [];
    let totalAmount = 0;

    if (customSlots && Array.isArray(customSlots) && customSlots.length > 0) {
      installments = customSlots.map((s, idx) => ({
        slotNumber: idx + 1,
        dueDate: new Date(s.dueDate || Date.now() + (idx + 1) * 30 * 86400000),
        amount: Math.round(parseFloat(s.amount) * 100),
        status: 'pending',
      }));
      totalAmount = installments.reduce((sum, slot) => sum + slot.amount, 0);
    } else {
      const count = parseInt(numberOfInstallments) || 2;
      const amountToSplit = feeDemand.outstandingAmount > 0 ? feeDemand.outstandingAmount : feeDemand.totalDemanded;
      totalAmount = amountToSplit;
      const perSlot = Math.floor(amountToSplit / count);

      for (let i = 0; i < count; i++) {
        const slotAmount = (i === count - 1) ? (amountToSplit - (perSlot * (count - 1))) : perSlot;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (30 * (i + 1)));

        installments.push({
          slotNumber: i + 1,
          dueDate,
          amount: slotAmount,
          status: 'pending',
        });
      }
    }

    const plan = await InstallmentPlan.create({
      name: name || `${installments.length}-Part Installment Schedule`,
      demand,
      student,
      installments,
      totalAmount,
      createdBy: req.user._id,
      status: 'active',
    });

    feeDemand.installmentPlan = plan._id;
    await feeDemand.save();

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'other',
      targetEntity: 'InstallmentPlan',
      targetId: plan._id,
      afterState: plan.toObject(),
      reason: `Created ${installments.length}-part installment plan for student`,
      amountAffected: totalAmount,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

// ─── CAUTION MONEY ────────────────────────────────────────────────────────

export const getCautionMoney = async (req, res, next) => {
  try {
    const records = await CautionMoney.find()
      .populate('student', 'name rollNumber email department batch')
      .populate('refundApprovedBy', 'name')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

export const disburseCautionMoney = async (req, res, next) => {
  try {
    const { studentIds, reason } = req.body;
    const results = [];

    for (const studentId of studentIds) {
      const record = await CautionMoney.findOne({ student: studentId, status: 'held' });
      if (!record) continue;

      record.status = 'refunded';
      record.refundAmount = record.depositAmount;
      record.refundDate = new Date();
      record.refundApprovedBy = req.user._id;
      record.refundTransactionRef = `CAUTION-REFUND-${Date.now()}`;
      await record.save();

      // Post ledger entries for caution money refund
      await postDoubleEntry({
        debitAccount: 'Caution Money Liability',
        creditAccount: 'Refund Payable',
        amount: record.depositAmount,
        narration: `Caution money disbursement — Student ${studentId}`,
        studentId,
        postedByLabel: req.user.name,
      });

      await AuditLog.create({
        adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
        action: 'disburse_caution_money', targetEntity: 'CautionMoney', targetId: record._id,
        afterState: record.toObject(), reason: reason || 'Graduation disbursement', ipAddress: req.ip,
        amountAffected: record.depositAmount,
      });

      results.push(record);
    }

    return res.json({ success: true, data: results, message: `Disbursed ${results.length} caution money records.` });
  } catch (err) { next(err); }
};

// ─── OFFLINE PAYMENTS ─────────────────────────────────────────────────────

export const getOfflinePayments = async (req, res, next) => {
  try {
    const txns = await Transaction.find({
      method: { $in: ['offline_dd', 'offline_challan', 'offline_cash'] },
    })
      .populate('student', 'name rollNumber')
      .populate('demand', 'semester academicYear')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: txns });
  } catch (err) { next(err); }
};

export const submitOfflinePayment = async (req, res, next) => {
  try {
    const { studentId, demandId, amount, method, offlineDetails } = req.body;

    const txn = await Transaction.create({
      idempotencyKey: `offline-${Date.now()}-${studentId}`,
      amount,
      currency: 'INR',
      method,
      status: 'pending_approval',
      student: studentId,
      demand: demandId,
      offlineDetails,
    });

    return res.status(201).json({ success: true, data: txn });
  } catch (err) { next(err); }
};

export const approveOfflinePayment = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id).populate('demand');
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    if (txn.status !== 'pending_approval') return res.status(400).json({ success: false, message: 'Transaction is not pending approval.' });

    let receipt;

    const executeApproval = async (sess) => {
      const opts = sess ? { session: sess } : {};
      txn.status = 'captured';
      txn.capturedAt = new Date();
      if (!txn.offlineDetails) txn.offlineDetails = {};
      txn.offlineDetails.approvedBy = req.user._id;
      txn.offlineDetails.approvedAt = new Date();
      await txn.save(opts);

      const demand = await settleFeePayment({
        studentId: txn.student,
        demandId: txn.demand._id,
        transactionId: txn._id,
        amountPaid: txn.amount,
        postedBy: req.user._id,
        postedByLabel: req.user.name,
        session: sess,
      });

      const student = sess
        ? await User.findById(txn.student).session(sess)
        : await User.findById(txn.student);

      receipt = await issueReceipt({
        transaction: txn,
        student,
        demand,
        amountPaid: txn.amount,
        components: demand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
        academicYear: demand.academicYear,
        semester: demand.semester,
        paymentMethod: txn.method,
        paymentReference: txn.offlineDetails?.ddNumber || txn.offlineDetails?.challanNo || 'N/A',
      }, sess);
    };

    const session = await getSession();
    if (session) {
      try {
        await session.withTransaction(async () => {
          await executeApproval(session);
        });
      } catch (txnErr) {
        if (txnErr.message?.includes('replica set') || txnErr.message?.includes('Transaction numbers')) {
          console.warn('⚠️  MongoDB standalone detected: approving offline payment without replica set transaction.');
          await executeApproval(null);
        } else {
          throw txnErr;
        }
      } finally {
        await session.endSession();
      }
    } else {
      await executeApproval(null);
    }

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'approve_offline_payment',
      targetEntity: 'Transaction',
      targetId: txn._id,
      afterState: txn.toObject(),
      reason: req.body.reason || 'Offline payment verified',
      amountAffected: txn.amount,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: { transaction: txn, receipt } });
  } catch (err) { next(err); }
};

export const rejectOfflinePayment = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: 'Not found.' });

    txn.status = 'failed';
    txn.failureReason = req.body.reason || 'Rejected by admin';
    await txn.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'reject_offline_payment', targetEntity: 'Transaction', targetId: txn._id,
      afterState: txn.toObject(), reason: req.body.reason || 'Rejected', ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Payment rejected.' });
  } catch (err) { next(err); }
};

// ─── FINANCIAL OVERRIDES ──────────────────────────────────────────────────

export const applyScholarship = async (req, res, next) => {
  try {
    const { demandId, amount, reason } = req.body;

    const demand = await FeeDemand.findById(demandId).populate('student');
    if (!demand) return res.status(404).json({ success: false, message: 'Demand not found.' });

    // Branch Superuser check: can only grant scholarship to their department students
    if (req.user?.role === 'superuser' && req.user?.department) {
      const userDeptId = String(req.user.department._id || req.user.department);
      const studentDeptId = String(demand.student?.department?._id || demand.student?.department);
      if (userDeptId !== studentDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Branch Superusers can only grant scholarships to students of their own department.',
        });
      }
    }

    const before = demand.toObject();
    demand.scholarshipAmount = (demand.scholarshipAmount || 0) + amount;
    demand.scholarshipAppliedBy = req.user._id;
    demand.scholarshipReason = reason;
    await demand.save();

    // Post scholarship ledger entries
    await postDoubleEntry({
      debitAccount: 'Scholarship Expense',
      creditAccount: 'Student Fee Receivable',
      amount,
      narration: `Scholarship applied: ${reason}`,
      studentId: demand.student,
      demandId: demand._id,
      postedBy: req.user._id,
      postedByLabel: req.user.name,
    });

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'apply_scholarship', targetEntity: 'FeeDemand', targetId: demand._id,
      beforeState: before, afterState: demand.toObject(),
      reason, amountAffected: amount, ipAddress: req.ip,
    });

    const populatedDemand = await FeeDemand.findById(demand._id)
      .populate({ path: 'student', populate: { path: 'department', select: 'name code' } })
      .populate('feeStructure', 'components batch');

    return res.json({ success: true, data: populatedDemand });
  } catch (err) { next(err); }
};

export const waiveLateFee = async (req, res, next) => {
  try {
    const { demandId, amount, reason } = req.body;

    const demand = await FeeDemand.findById(demandId);
    if (!demand) return res.status(404).json({ success: false, message: 'Demand not found.' });

    const before = demand.toObject();
    const waiveAmount = Math.min(amount, demand.lateFeeAccrued);
    demand.lateFeeAccrued -= waiveAmount;
    demand.totalWaived = (demand.totalWaived || 0) + waiveAmount;
    await demand.save();

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'waive_late_fee', targetEntity: 'FeeDemand', targetId: demand._id,
      beforeState: before, afterState: demand.toObject(),
      reason, amountAffected: waiveAmount, ipAddress: req.ip,
    });

    const populatedDemand = await FeeDemand.findById(demand._id)
      .populate({ path: 'student', populate: { path: 'department', select: 'name code' } })
      .populate('feeStructure', 'components batch');

    return res.json({ success: true, data: populatedDemand, message: `Late fee of ₹${(waiveAmount/100).toFixed(2)} waived.` });
  } catch (err) { next(err); }
};

export const getAuditTrail = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('adminId', 'name email'),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({ success: true, data: logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
