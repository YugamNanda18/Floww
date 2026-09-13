import { parse } from 'csv-parse/sync';
import User from '../models/User.js';
import Department from '../models/Department.js';
import FeeStructure from '../models/FeeStructure.js';
import FeeDemand from '../models/FeeDemand.js';
import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';
import { syncStudentsToCsv } from '../utils/csvSync.js';

export const getSuperuserAnalytics = async (req, res, next) => {
  try {
    const isBranchScoped = Boolean(req.user.department && req.user.employeeId !== 'SUP001' && req.user.email !== 'super@demo.com');
    const branchDeptId = isBranchScoped ? (req.user.department._id || req.user.department) : null;

    let branchDeptDoc = null;
    let deptStudentIds = null;
    let studentFilter = { role: 'student', isActive: true };

    if (isBranchScoped && branchDeptId) {
      branchDeptDoc = typeof req.user.department.name === 'string'
        ? req.user.department
        : await Department.findById(branchDeptId);

      studentFilter.department = branchDeptId;
      const deptStudents = await User.find({ role: 'student', department: branchDeptId }).select('_id').lean();
      deptStudentIds = deptStudents.map((s) => s._id);
    }

    const txMatch = { status: 'captured' };
    if (isBranchScoped) {
      txMatch.student = { $in: deptStudentIds || [] };
    }

    const demandMatch = {};
    if (isBranchScoped) {
      demandMatch.student = { $in: deptStudentIds || [] };
    }

    const deptStatsPipeline = [
      ...(isBranchScoped ? [{ $match: { student: { $in: deptStudentIds || [] } } }] : []),
      { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentData' } },
      { $unwind: '$studentData' },
      { $lookup: { from: 'departments', localField: 'studentData.department', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$dept.name',
          totalDemanded: { $sum: '$totalDemanded' },
          totalPaid: { $sum: '$totalPaid' },
          totalOutstanding: { $sum: '$outstandingAmount' },
          studentCount: { $addToSet: '$student' },
        },
      },
      { $project: { name: '$_id', totalDemanded: 1, totalPaid: 1, totalOutstanding: 1, studentCount: { $size: '$studentCount' } } },
    ];

    const [
      totalStudents, totalRevenue, totalOutstanding,
      rawDeptStats, monthlyRevenue,
    ] = await Promise.all([
      User.countDocuments(studentFilter),
      Transaction.aggregate([{ $match: txMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      FeeDemand.aggregate([
        ...(Object.keys(demandMatch).length ? [{ $match: demandMatch }] : []),
        { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
      ]),
      FeeDemand.aggregate(deptStatsPipeline),
      Transaction.aggregate([
        { $match: txMatch },
        {
          $group: {
            _id: { year: { $year: '$capturedAt' }, month: { $month: '$capturedAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

    let deptStats = rawDeptStats;
    if (isBranchScoped && (!deptStats || deptStats.length === 0)) {
      deptStats = [{
        name: branchDeptDoc ? branchDeptDoc.name : 'Your Department',
        totalDemanded: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        studentCount: deptStudentIds ? deptStudentIds.length : 0,
      }];
    }

    const totalRev = totalRevenue[0]?.total || 0;
    const totalOut = totalOutstanding[0]?.total || 0;
    const projectedRevenue = totalRev + totalOut;
    const collectionRate = projectedRevenue > 0 ? Math.round((totalRev / projectedRevenue) * 100) : 0;

    return res.json({
      success: true,
      data: {
        scope: isBranchScoped
          ? {
              isBranchScoped: true,
              departmentId: branchDeptId,
              departmentName: branchDeptDoc?.name || 'Department',
              departmentCode: branchDeptDoc?.code || 'DEPT',
              label: `${branchDeptDoc?.name || 'Department'} (${branchDeptDoc?.code || 'DEPT'})`,
            }
          : {
              isBranchScoped: false,
              label: 'Institutional (All Departments)',
            },
        kpis: {
          totalStudents,
          totalRevenue: totalRev,
          totalOutstanding: totalOut,
          projectedRevenue,
          collectionRate,
        },
        deptStats,
        monthlyRevenue,
      },
    });
  } catch (err) { next(err); }
};

export const getForecasting = async (req, res, next) => {
  try {
    const isBranchScoped = Boolean(req.user.department && req.user.employeeId !== 'SUP001' && req.user.email !== 'super@demo.com');
    const branchDeptId = isBranchScoped ? (req.user.department._id || req.user.department) : null;

    let match = {};
    if (isBranchScoped && branchDeptId) {
      const deptStudents = await User.find({ role: 'student', department: branchDeptId }).select('_id').lean();
      match.student = { $in: deptStudents.map((s) => s._id) };
    }

    const data = await FeeDemand.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: { semester: '$semester', academicYear: '$academicYear' },
          projected: { $sum: '$totalDemanded' },
          actual: { $sum: '$totalPaid' },
          outstanding: { $sum: '$outstandingAmount' },
        },
      },
      { $sort: { '_id.academicYear': 1, '_id.semester': 1 } },
    ]);

    return res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const bulkUploadStudents = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });

    const csvContent = req.file.buffer.toString('utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    if (req.query.preview === 'true') {
      return res.json({ success: true, data: { preview: records.slice(0, 10), totalRows: records.length } });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of records) {
      try {
        const { name, email, rollNumber, department, batch, semester, phone } = row;

        const dept = await Department.findOne({ code: department?.toUpperCase() });

        const existing = await User.findOne({ $or: [{ email }, { rollNumber }] });
        if (existing) { results.skipped++; continue; }

        await User.create({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: rollNumber || 'LedgerX@123', // default password = roll number
          role: 'student',
          rollNumber: rollNumber?.trim(),
          department: dept?._id,
          batch: batch?.trim(),
          currentSemester: parseInt(semester) || 1,
          phone: phone?.trim(),
        });

        results.created++;
      } catch (err) {
        results.errors.push({ row, error: err.message });
      }
    }

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'bulk_student_upload', targetEntity: 'User',
      afterState: results, reason: `Bulk upload: ${results.created} created, ${results.skipped} skipped`,
      ipAddress: req.ip,
    });

    syncStudentsToCsv().catch((err) => console.error('CSV Sync Error:', err.message));

    return res.json({ success: true, data: results });
  } catch (err) { next(err); }
};

export const promoteStudents = async (req, res, next) => {
  try {
    const { department, batch, fromSemester } = req.body;

    const filter = { role: 'student', currentSemester: fromSemester, isActive: true };
    if (department) filter.department = department;
    if (batch) filter.batch = batch;

    const students = await User.find(filter);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'No students found matching criteria.' });

    const nextSemester = fromSemester + 1;
    if (nextSemester > 8) return res.status(400).json({ success: false, message: 'Cannot promote beyond semester 8.' });

    // Find fee structure for next semester
    const feeStructures = await FeeStructure.find({
      semester: nextSemester,
      isPublished: true,
      ...(department ? { department } : {}),
    });

    let promoted = 0;
    let demandsCreated = 0;

    for (const student of students) {
      await User.findByIdAndUpdate(student._id, { currentSemester: nextSemester });
      promoted++;

      // Generate fee demand for new semester
      const fs = feeStructures.find(f => String(f.department) === String(student.department)) || feeStructures[0];
      if (fs) {
        const existing = await FeeDemand.findOne({ student: student._id, semester: nextSemester, academicYear: fs.academicYear });
        if (!existing) {
          await FeeDemand.create({
            student: student._id,
            feeStructure: fs._id,
            semester: nextSemester,
            academicYear: fs.academicYear,
            dueDate: fs.dueDate,
            components: fs.components.map(c => ({
              name: c.name,
              demandedAmount: c.amount,
              paidAmount: 0,
              status: 'pending',
            })),
            totalDemanded: fs.totalAmount,
            outstandingAmount: fs.totalAmount,
            status: 'pending',
          });
          demandsCreated++;
        }
      }
    }

    await AuditLog.create({
      adminId: req.user._id, adminName: req.user.name, adminEmail: req.user.email,
      action: 'semester_promotion', targetEntity: 'User',
      afterState: { promoted, demandsCreated, fromSemester, nextSemester },
      reason: `Batch promotion: Sem ${fromSemester} → Sem ${nextSemester}`, ipAddress: req.ip,
    });

    return res.json({ success: true, data: { promoted, demandsCreated, nextSemester } });
  } catch (err) { next(err); }
};

export const getAllDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find();
    return res.json({ success: true, data: depts });
  } catch (err) { next(err); }
};

export const createDepartment = async (req, res, next) => {
  try {
    // Only Main Superuser can create departments, sub/branch superusers cannot
    const isSubSuperuser = Boolean(req.user.department && req.user.employeeId !== 'SUP001' && req.user.email !== 'super@demo.com');
    if (isSubSuperuser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the Main Superuser (Institutional Dean) has the authority to create academic departments. Sub/Branch superusers cannot create departments.',
      });
    }

    const { name, code, head, totalSeats } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Department.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Department with code '${cleanCode}' already exists.` });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: cleanCode,
      head: head ? head.trim() : undefined,
      totalSeats: totalSeats ? parseInt(totalSeats) : 60,
    });

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'create_department',
      targetEntity: 'Department',
      targetId: dept._id,
      afterState: dept.toObject(),
      reason: `New academic department created: ${dept.name} (${dept.code}) by Main Superuser`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: dept });
  } catch (err) { next(err); }
};
