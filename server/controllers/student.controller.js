import mongoose from 'mongoose';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';
import Receipt from '../models/Receipt.js';
import Timetable from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';
import { getDaysOverdue } from '../services/lateFee.service.js';
import { getStudentLedger } from '../services/ledger.service.js';
import { verifyReceiptHash } from '../services/receipt.service.js';

export const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    // All demands for student
    const allDemands = await FeeDemand.find({ student: studentId }).sort({ semester: -1 });

    const totalOutstanding = allDemands.reduce((sum, d) => sum + (d.outstandingAmount || 0), 0);
    const totalPaid = allDemands.reduce((sum, d) => sum + (d.totalPaid || 0), 0);

    // Current semester demand (what the student is currently enrolled in)
    let currentDemand = await FeeDemand.findOne({
      student: studentId,
      semester: req.user.currentSemester,
    })
      .populate('feeStructure', 'components dueDate gracePeriodDays')
      .populate('lateFeeRule');

    // If no demand exists for currentSemester, fallback to latest demand
    if (!currentDemand && allDemands.length > 0) {
      currentDemand = await FeeDemand.findById(allDemands[0]._id)
        .populate('feeStructure', 'components dueDate gracePeriodDays')
        .populate('lateFeeRule');
    }

    let daysOverdue = 0;
    let dailyPenaltyRate = null;

    if (currentDemand) {
      const isPaid = currentDemand.status === 'paid' || (currentDemand.outstandingAmount <= 0 && (currentDemand.lateFeeAccrued || 0) <= 0);
      const isCompliantPartial = currentDemand.status === 'partial' || (currentDemand.totalPaid > 0 && new Date(currentDemand.dueDate) >= new Date());

      if (!isPaid && !isCompliantPartial && (currentDemand.status === 'overdue' || new Date(currentDemand.dueDate) < new Date())) {
        daysOverdue = getDaysOverdue(currentDemand.dueDate);
      }

      if (currentDemand.lateFeeRule?.ruleType === 'dailyPercentage') {
        dailyPenaltyRate = currentDemand.lateFeeRule.dailyRate;
      }
    }

    // Overdue count only considers non-compliant, non-paid demands
    const overdueCount = totalOutstanding <= 0 ? 0 : allDemands.filter(d => 
      (d.status === 'overdue' || (new Date(d.dueDate) < new Date() && d.outstandingAmount > 0)) &&
      d.status !== 'paid' && d.status !== 'partial'
    ).length;

    // Recent receipts
    const recentReceipts = await Receipt.find({ student: studentId })
      .sort({ issuedAt: -1 })
      .limit(3)
      .select('receiptNumber amountPaid semester issuedAt paymentMethod');

    // Attendance & Today's Schedule
    const attendance = await Attendance.findOne({ student: studentId });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[new Date().getDay()];
    const activeDay = currentDayName === 'Sunday' ? 'Monday' : currentDayName;

    let timetable = await Timetable.findOne({
      department: req.user.department,
      semester: req.user.currentSemester,
    });
    if (!timetable) {
      timetable = await Timetable.findOne({ department: req.user.department });
    }
    const todayDayPlan = timetable?.weeklySchedule?.find(s => s.day === activeDay);

    return res.json({
      success: true,
      data: {
        student: {
          name: req.user.name,
          rollNumber: req.user.rollNumber,
          currentSemester: req.user.currentSemester,
          batch: req.user.batch,
          department: req.user.department,
        },
        currentDemand,
        daysOverdue,
        dailyPenaltyRate,
        summary: {
          totalOutstanding,
          totalPaid,
          allDemandCount: allDemands.length,
          overdueCount,
        },
        recentReceipts,
        attendance: attendance ? {
          overallPercentage: attendance.overallPercentage,
          hasShortage: attendance.hasShortage,
          totalSubjects: attendance.subjects.length,
          shortageSubjectsCount: attendance.subjects.filter(s => s.isShortage).length,
        } : null,
        todaySchedule: {
          day: activeDay,
          collegeHours: timetable?.collegeHours || '08:00 AM - 03:00 PM',
          lunchBreak: timetable?.lunchBreak || '11:15 AM - 12:00 PM',
          slots: todayDayPlan?.slots || [],
        },
      },
    });
  } catch (err) { next(err); }
};

export const resolveDefaulterClearance = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const allDemands = await FeeDemand.find({ student: studentId });

    const graceDate = new Date();
    graceDate.setDate(graceDate.getDate() + 30);

    let clearedCount = 0;
    for (const d of allDemands) {
      const balance = Math.max(0, (d.outstandingAmount || 0) + (d.lateFeeAccrued || 0));
      if (balance <= 0) {
        d.status = 'paid';
        d.lateFeeAccrued = 0;
        await d.save();
        clearedCount++;
      } else if (d.status === 'overdue' || new Date(d.dueDate) < new Date()) {
        d.status = 'partial';
        d.dueDate = graceDate;
        d.lateFeeAccrued = 0;
        await d.save();
        clearedCount++;
      }
    }

    return res.json({
      success: true,
      message: 'Defaulter status resolved. 30-day compliance grace granted.',
      clearedCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentDemands = async (req, res, next) => {
  try {
    const { semester, academicYear, status } = req.query;
    const filter = { student: req.user._id };

    if (semester) filter.semester = parseInt(semester);
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;

    const demands = await FeeDemand.find(filter)
      .sort({ semester: -1 })
      .populate('feeStructure', 'components gracePeriodDays')
      .populate('lateFeeRule', 'ruleType flatAmount dailyRate maxCap');

    return res.json({ success: true, data: demands });
  } catch (err) { next(err); }
};

export const getDemandById = async (req, res, next) => {
  try {
    const demand = await FeeDemand.findOne({ _id: req.params.id, student: req.user._id })
      .populate('feeStructure')
      .populate('lateFeeRule')
      .populate('installmentPlan');

    if (!demand) return res.status(404).json({ success: false, message: 'Demand not found.' });
    return res.json({ success: true, data: demand });
  } catch (err) { next(err); }
};

export const getStudentLedgerEntries = async (req, res, next) => {
  try {
    const entries = await getStudentLedger(req.user._id);
    return res.json({ success: true, data: entries });
  } catch (err) { next(err); }
};

export const getStudentReceipts = async (req, res, next) => {
  try {
    const { semester, academicYear } = req.query;
    const filter = { student: req.user._id };
    if (semester) filter.semester = parseInt(semester);
    if (academicYear) filter.academicYear = academicYear;

    const receipts = await Receipt.find(filter)
      .sort({ issuedAt: -1 })
      .populate('transaction', 'method razorpayPaymentId offlineDetails capturedAt');

    return res.json({ success: true, data: receipts });
  } catch (err) { next(err); }
};

export const getReceiptById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    let receipt = null;

    // 1. Try finding by receipt _id if valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      receipt = await Receipt.findOne({ _id: id, student: studentId })
        .populate('student', 'name rollNumber email department batch')
        .populate('demand', 'semester academicYear components')
        .populate('transaction', 'method razorpayPaymentId offlineDetails capturedAt');
      
      // 2. If not found by receipt _id, try finding by transaction _id
      if (!receipt) {
        receipt = await Receipt.findOne({ transaction: id, student: studentId })
          .populate('student', 'name rollNumber email department batch')
          .populate('demand', 'semester academicYear components')
          .populate('transaction', 'method razorpayPaymentId offlineDetails capturedAt');
      }
    }

    // 3. Try finding by receiptNumber string (e.g. REC-ECE2401-S1)
    if (!receipt) {
      receipt = await Receipt.findOne({ receiptNumber: id, student: studentId })
        .populate('student', 'name rollNumber email department batch')
        .populate('demand', 'semester academicYear components')
        .populate('transaction', 'method razorpayPaymentId offlineDetails capturedAt');
    }

    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found.' });
    return res.json({ success: true, data: receipt });
  } catch (err) { next(err); }
};

export const verifyReceipt = async (req, res, next) => {
  try {
    const result = await verifyReceiptHash(req.params.receiptNumber);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getStudentTimetable = async (req, res, next) => {
  try {
    let timetable = await Timetable.findOne({
      department: req.user.department,
      semester: req.user.currentSemester,
    }).populate('department', 'name code');

    if (!timetable) {
      timetable = await Timetable.findOne({
        department: req.user.department,
      }).populate('department', 'name code');
    }

    return res.json({
      success: true,
      data: timetable || null,
    });
  } catch (err) { next(err); }
};

export const getStudentAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({ student: req.user._id });
    return res.json({
      success: true,
      data: attendance || null,
    });
  } catch (err) { next(err); }
};

export const getStudentProfile = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id).populate('department');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [attendance, allDemands] = await Promise.all([
      Attendance.findOne({ student: student._id }),
      FeeDemand.find({ student: student._id }).sort({ semester: -1 }),
    ]);

    const totalOutstanding = allDemands.reduce((sum, d) => sum + (d.outstandingAmount || 0), 0);
    const totalPaid = allDemands.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const hasOverdue = allDemands.some(d => d.status === 'overdue');

    return res.json({
      success: true,
      data: {
        student,
        academicSummary: {
          attendancePercentage: attendance?.overallPercentage ?? 85,
          hasShortage: attendance?.hasShortage ?? false,
          totalSubjects: attendance?.subjects?.length || 5,
        },
        financialSummary: {
          totalOutstanding,
          totalPaid,
          status: hasOverdue ? 'overdue' : totalOutstanding > 0 ? 'pending' : 'paid',
          demandsCount: allDemands.length,
        },
      },
    });
  } catch (err) { next(err); }
};

export const updateStudentProfile = async (req, res, next) => {
  try {
    const { phone, guardianName, guardianPhone, address, bio, profilePhoto, dob, bloodGroup, emergencyContact } = req.body;

    const student = await User.findById(req.user._id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (phone !== undefined) student.phone = phone;
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    if (address !== undefined) student.address = address;
    if (bio !== undefined) student.bio = bio;
    if (profilePhoto !== undefined) student.profilePhoto = profilePhoto;
    if (dob !== undefined) student.dob = dob;
    if (bloodGroup !== undefined) student.bloodGroup = bloodGroup;
    if (emergencyContact !== undefined) student.emergencyContact = emergencyContact;

    await student.save();
    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: student,
    });
  } catch (err) { next(err); }
};

