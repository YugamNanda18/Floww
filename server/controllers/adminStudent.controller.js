import User from '../models/User.js';
import Department from '../models/Department.js';
import FeeDemand from '../models/FeeDemand.js';
import FeeStructure from '../models/FeeStructure.js';
import Transaction from '../models/Transaction.js';
import LedgerEntry from '../models/LedgerEntry.js';
import CautionMoney from '../models/CautionMoney.js';
import AuditLog from '../models/AuditLog.js';
import Attendance from '../models/Attendance.js';
import Timetable from '../models/Timetable.js';
import { postDoubleEntry } from '../services/ledger.service.js';
import { v4 as uuidv4 } from 'uuid';
import { syncStudentsToCsv } from '../utils/csvSync.js';
import { syncStudentToRedis } from '../services/redisSync.service.js';
import { sendRealtimeFeeDueReminder, sendMassRealtimeFeeReminders } from '../services/notification.service.js';

/**
 * getAdminStudents — List students with department, fee demand summaries, and defaulter status.
 */
export const getAdminStudents = async (req, res, next) => {
  try {
    const { department, semester, status, search, page = 1, limit = 50 } = req.query;

    const userQuery = { role: 'student', isActive: true };
    if (req.user?.role === 'superuser' && req.user?.department) {
      userQuery.department = req.user.department._id || req.user.department;
    } else if (department) {
      userQuery.department = department;
    }
    if (semester) userQuery.currentSemester = parseInt(semester);
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(userQuery)
      .populate('department', 'name code')
      .sort({ rollNumber: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // Aggregate demands for these students
    const demands = await FeeDemand.find({ student: { $in: studentIds } })
      .sort({ semester: -1 })
      .lean();

    const demandsByStudent = {};
    for (const d of demands) {
      const sId = d.student.toString();
      if (!demandsByStudent[sId]) demandsByStudent[sId] = [];
      demandsByStudent[sId].push(d);
    }

    // Merge student info with financial summary
    let enriched = students.map((s) => {
      const sDemands = demandsByStudent[s._id.toString()] || [];
      const totalDemanded = sDemands.reduce((acc, d) => acc + (d.totalDemanded || 0), 0);
      const totalPaid = sDemands.reduce((acc, d) => acc + (d.totalPaid || 0), 0);
      const totalOutstanding = sDemands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
      const totalLateFee = sDemands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);
      const overdueDemands = sDemands.filter((d) => d.status === 'overdue');
      const isDefaulter = overdueDemands.length > 0;

      let feeStatus = 'paid';
      if (isDefaulter) feeStatus = 'overdue';
      else if (totalOutstanding > 0 && totalPaid > 0) feeStatus = 'partial';
      else if (totalOutstanding > 0) feeStatus = 'pending';

      return {
        ...s,
        financials: {
          totalDemanded,
          totalPaid,
          totalOutstanding,
          totalLateFee,
          overdueCount: overdueDemands.length,
          demandsCount: sDemands.length,
          feeStatus,
          isDefaulter,
        },
      };
    });

    // Filter by financial feeStatus if requested
    if (status && status !== 'all') {
      if (status === 'defaulter') {
        enriched = enriched.filter((s) => s.financials.isDefaulter);
      } else {
        enriched = enriched.filter((s) => s.financials.feeStatus === status);
      }
    }

    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * limit, page * limit);

    // Compute summary stats
    const totalDefaulters = enriched.filter((s) => s.financials.isDefaulter).length;
    const totalInstituteOutstanding = enriched.reduce((acc, s) => acc + s.financials.totalOutstanding, 0);

    return res.json({
      success: true,
      data: {
        students: paginated,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        stats: {
          totalStudents: total,
          totalDefaulters,
          totalInstituteOutstanding,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getStudentFinancialHistory — Full financial history of an individual student.
 */
export const getStudentFinancialHistory = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id).populate('department');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const deptId = student.department?._id || student.department;
    const [demands, transactions, ledgerEntries, cautionMoney, auditLogs, attendance, timetable] = await Promise.all([
      FeeDemand.find({ student: student._id }).sort({ semester: -1 }).populate('feeStructure lateFeeRule'),
      Transaction.find({ student: student._id }).sort({ createdAt: -1 }),
      LedgerEntry.find({ relatedStudent: student._id }).sort({ postedAt: -1 }),
      CautionMoney.findOne({ student: student._id }),
      AuditLog.find({ targetEntity: { $regex: student.rollNumber } }).sort({ timestamp: -1 }),
      Attendance.findOne({ student: student._id }),
      Timetable.findOne({ department: deptId, semester: student.currentSemester }),
    ]);

    return res.json({
      success: true,
      data: {
        student,
        demands,
        transactions,
        ledgerEntries,
        cautionMoney,
        auditLogs,
        attendance,
        timetable,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getAdminDemands — List fee demands with department, student, and pagination.
 */
export const getAdminDemands = async (req, res, next) => {
  try {
    const { department, semester, academicYear, status, search, studentId, student, page = 1, limit = 50 } = req.query;

    const query = {};
    if (studentId || student) query.student = studentId || student;
    if (semester) query.semester = parseInt(semester);
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    let studentFilter = {};
    if (req.user?.role === 'superuser' && req.user?.department) {
      studentFilter.department = req.user.department._id || req.user.department;
    } else if (department) {
      studentFilter.department = department;
    }
    if (search) {
      studentFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if ((department || search || (req.user?.role === 'superuser' && req.user?.department)) && !query.student) {
      const matchingStudents = await User.find(studentFilter).select('_id');
      query.student = { $in: matchingStudents.map((s) => s._id) };
    }

    const [demands, total] = await Promise.all([
      FeeDemand.find(query)
        .populate({ path: 'student', populate: { path: 'department', select: 'name code' } })
        .populate('feeStructure', 'components batch')
        .populate('lateFeeRule')
        .sort({ dueDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FeeDemand.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        demands,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * raiseIndividualDemand — Manually raise a fee demand for a student.
 */
export const raiseIndividualDemand = async (req, res, next) => {
  try {
    const { studentId, feeStructureId, dueDate, customComponents } = req.body;

    const [student, feeStructure] = await Promise.all([
      User.findById(studentId),
      FeeStructure.findById(feeStructureId),
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!feeStructure) return res.status(404).json({ success: false, message: 'Fee structure not found' });

    // Check if demand already exists for this semester
    const existing = await FeeDemand.findOne({
      student: student._id,
      semester: feeStructure.semester,
      academicYear: feeStructure.academicYear,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Demand already exists for ${student.name} (Semester ${feeStructure.semester}, ${feeStructure.academicYear}).`,
      });
    }

    const components = customComponents || feeStructure.components.map((c) => ({
      name: c.name,
      demandedAmount: c.amount,
      paidAmount: 0,
      waivedAmount: 0,
      status: 'pending',
    }));

    const totalDemanded = components.reduce((s, c) => s + c.demandedAmount, 0);

    const demand = await FeeDemand.create({
      student: student._id,
      feeStructure: feeStructure._id,
      semester: feeStructure.semester,
      academicYear: feeStructure.academicYear,
      dueDate: dueDate ? new Date(dueDate) : feeStructure.dueDate,
      components,
      totalDemanded,
      totalPaid: 0,
      totalWaived: 0,
      outstandingAmount: totalDemanded,
      status: 'pending',
    });

    // Post initial double-entry journal (DR Student Fee Receivable / CR Fee Income)
    await postDoubleEntry({
      debitAccount: 'Student Fee Receivable',
      creditAccount: 'Fee Income',
      amount: totalDemanded,
      narration: `Manual Fee Demand Raised — ${feeStructure.academicYear} Sem ${feeStructure.semester}`,
      studentId: student._id,
      demandId: demand._id,
      postedBy: req.user._id,
      postedByLabel: `${req.user.name} (Admin)`,
    });

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'raise_manual_demand',
      targetEntity: `Student:${student.rollNumber}`,
      targetId: demand._id,
      amountAffected: totalDemanded,
      reason: req.body.reason || 'Manual demand raised by finance administrator',
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: demand });
  } catch (err) {
    next(err);
  }
};

/**
 * bulkRaiseDemands — Superuser/Admin bulk demand generation for an entire cohort.
 */
export const bulkRaiseDemands = async (req, res, next) => {
  try {
    const { departmentId, batch, semester, academicYear, dueDate } = req.body;

    // Find all matching students
    const query = { role: 'student', isActive: true };
    if (departmentId) query.department = departmentId;
    if (batch) query.batch = batch;
    if (semester) query.currentSemester = parseInt(semester);

    let students = await User.find(query);
    if (students.length === 0) {
      // Fallback: match by department / batch if no students match the exact currentSemester
      const fallbackQuery = { role: 'student', isActive: true };
      if (departmentId) fallbackQuery.department = departmentId;
      if (batch) fallbackQuery.batch = batch;
      students = await User.find(fallbackQuery);
    }

    if (students.length === 0) {
      // General fallback: all active students
      students = await User.find({ role: 'student', isActive: true });
    }

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found matching criteria.' });
    }

    // Find active or published fee structure
    const fsQuery = {
      semester: parseInt(semester),
    };
    if (departmentId) fsQuery.department = departmentId;
    if (academicYear) fsQuery.academicYear = academicYear;

    let feeStructure = await FeeStructure.findOne({ ...fsQuery, isPublished: true });
    if (!feeStructure) feeStructure = await FeeStructure.findOne({ ...fsQuery, isActive: true });
    if (!feeStructure) feeStructure = await FeeStructure.findOne(fsQuery);
    if (!feeStructure) feeStructure = await FeeStructure.findOne({ semester: parseInt(semester) });

    // If still none exists, auto-create a standard default structure for this department and semester
    if (!feeStructure) {
      const targetDeptId = departmentId || students[0]?.department;
      feeStructure = await FeeStructure.create({
        department: targetDeptId,
        batch: batch || '2024-2028',
        semester: parseInt(semester),
        academicYear: academicYear || '2024-25',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 60 * 86400000),
        totalAmount: 9500000,
        components: [
          { name: 'Tuition', amount: 8000000 },
          { name: 'Development', amount: 800000 },
          { name: 'Lab', amount: 500000 },
          { name: 'Exam', amount: 200000 },
        ],
        isPublished: true,
      });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const exists = await FeeDemand.findOne({
        student: student._id,
        semester: parseInt(semester),
        academicYear,
      });

      if (exists) {
        skippedCount++;
        continue;
      }

      const components = feeStructure.components.map((c) => ({
        name: c.name,
        demandedAmount: c.amount,
        paidAmount: 0,
        waivedAmount: 0,
        status: 'pending',
      }));

      const totalDemanded = feeStructure.totalAmount;

      const demand = await FeeDemand.create({
        student: student._id,
        feeStructure: feeStructure._id,
        semester: parseInt(semester),
        academicYear,
        dueDate: dueDate ? new Date(dueDate) : feeStructure.dueDate,
        components,
        totalDemanded,
        totalPaid: 0,
        totalWaived: 0,
        outstandingAmount: totalDemanded,
        status: 'pending',
      });

      // Post double-entry journal
      await postDoubleEntry({
        debitAccount: 'Student Fee Receivable',
        creditAccount: 'Fee Income',
        amount: totalDemanded,
        narration: `Bulk Cohort Demand Raised — ${academicYear} Sem ${semester}`,
        studentId: student._id,
        demandId: demand._id,
        postedBy: req.user._id,
        postedByLabel: `${req.user.name} (Bulk Operation)`,
      });

      createdCount++;
    }

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'bulk_raise_demands',
      targetEntity: `Cohort:${academicYear}_Sem${semester}`,
      amountAffected: createdCount * feeStructure.totalAmount,
      reason: `Bulk demands raised for ${createdCount} students (Skipped: ${skippedCount})`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      data: {
        createdCount,
        skippedCount,
        totalEligible: students.length,
        feeStructure: feeStructure.title || `Sem ${semester}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * createStudent — Manually register a new student with full profile, fee demand, caution money, and attendance setup.
 */
export const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      rollNumber,
      password = 'demo123',
      departmentId,
      batch = '2025-2029',
      currentSemester = 1,
      gender = 'male',
      dob,
      bloodGroup,
      phone,
      guardianName,
      guardianPhone,
      address,
      profilePhoto,
      emergencyContact,
      bio,
    } = req.body;

    if (req.user?.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Academic Governance Violation: Admissions and student onboarding are restricted to Academic Superusers according to their branch. Finance Administrators manage fee demands, payments, and double-entry accounts.',
      });
    }

    // Lock branch superuser to their assigned department
    let finalDepartmentId = departmentId;
    if (req.user?.role === 'superuser' && req.user?.department) {
      finalDepartmentId = req.user.department._id || req.user.department;
    }

    if (!name || !email || !rollNumber || !finalDepartmentId) {
      return res.status(400).json({ success: false, message: 'Name, email, roll number, and department are required.' });
    }

    // Check for existing user
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { rollNumber: rollNumber.trim() }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Student with email '${email}' or Roll Number '${rollNumber}' already exists.`,
      });
    }

    const defaultPhotos = {
      male: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      female: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      other: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    };

    const finalPhoto = profilePhoto || defaultPhotos[gender] || defaultPhotos.male;

    const parsedSem = Math.min(Math.max(parseInt(currentSemester) || 1, 1), 8);
    const derivedYear = Math.ceil(parsedSem / 2);
    const startCohort = 2025 - (derivedYear - 1);
    const endCohort = startCohort + 4;
    const computedCohort = `${startCohort}-${endCohort}`;
    // If client sends custom batch that doesn't match default 2025-2029, respect it; otherwise use cohort batch
    const finalBatch = (batch && batch !== '2025-2029' && batch.includes('-')) ? batch.trim() : computedCohort;
    const finalAcademicYear = req.body.academicYear || `2025-26`;

    const deptDoc = await Department.findById(finalDepartmentId);
    const deptCode = deptDoc?.code || 'CSE';
    const deptAnnualPaise = deptDoc?.annualFee ? deptDoc.annualFee * 100 : 11000000;
    const semDemandedPaise = Math.round(deptAnnualPaise / 2);

    // 1. Create Student User in MongoDB
    const student = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: 'student',
      rollNumber: rollNumber.trim(),
      department: finalDepartmentId,
      batch: finalBatch,
      currentSemester: parsedSem,
      year: derivedYear,
      academicYear: finalAcademicYear,
      gender,
      dob: dob || '2006-01-01',
      bloodGroup: bloodGroup || 'O+',
      phone: phone || '+91 98000 00000',
      guardianName: guardianName || 'Parent / Guardian',
      guardianPhone: guardianPhone || '+91 98000 11111',
      address: address || 'Campus Hostel / Local Residence',
      bio: bio || `B.Tech Student (${deptCode}, Year ${derivedYear}, Semester ${parsedSem})`,
      profilePhoto: finalPhoto,
      emergencyContact: emergencyContact || phone,
      isActive: true,
    });

    // 2. Find or Create FeeStructure for student's department, batch, and semester
    let feeStructure = await FeeStructure.findOne({
      department: finalDepartmentId,
      semester: parsedSem,
      batch: finalBatch,
    });

    if (!feeStructure) {
      feeStructure = await FeeStructure.findOne({
        department: finalDepartmentId,
        semester: parsedSem,
      });
    }

    if (!feeStructure) {
      const tuition = Math.round(semDemandedPaise * 0.70);
      const dev = Math.round(semDemandedPaise * 0.15);
      const lib = Math.round(semDemandedPaise * 0.10);
      const exam = semDemandedPaise - (tuition + dev + lib);

      feeStructure = await FeeStructure.create({
        department: finalDepartmentId,
        batch: finalBatch,
        semester: parsedSem,
        academicYear: finalAcademicYear,
        dueDate: new Date(Date.now() + 30 * 86400000),
        totalAmount: semDemandedPaise,
        components: [
          { name: 'Tuition', amount: tuition },
          { name: 'Development', amount: dev },
          { name: 'Library', amount: lib },
          { name: 'Exam', amount: exam },
        ],
        isPublished: true,
        isActive: true,
      });
    }

    // 3. Create FeeDemand for student's current semester
    const components = feeStructure.components.map((c) => ({
      name: c.name,
      demandedAmount: c.amount,
      paidAmount: 0,
      waivedAmount: 0,
      status: 'pending',
    }));

    const totalDemanded = feeStructure.totalAmount;

    const demand = await FeeDemand.create({
      student: student._id,
      feeStructure: feeStructure._id,
      semester: parsedSem,
      academicYear: feeStructure.academicYear || finalAcademicYear,
      dueDate: feeStructure.dueDate || new Date(Date.now() + 30 * 86400000),
      components,
      totalDemanded,
      totalPaid: 0,
      totalWaived: 0,
      outstandingAmount: totalDemanded,
      status: 'pending',
    });

    // 4. Post double-entry journal assessment
    await postDoubleEntry({
      debitAccount: 'Student Fee Receivable',
      creditAccount: 'Tuition Fee Revenue',
      amount: totalDemanded,
      narration: `New Student Onboarding Assessment — Sem ${currentSemester}`,
      studentId: student._id,
      demandId: demand._id,
      postedBy: req.user._id,
      postedByLabel: `${req.user.name} (Admin Onboarding)`,
    });

    // 5. Create Caution Money Security Deposit (Held)
    const cautionMoney = await CautionMoney.create({
      student: student._id,
      depositAmount: 1000000,
      depositDate: new Date(),
      status: 'held',
      refundAmount: 0,
      notes: 'Institutional security deposit held in college treasury escrow',
    });

    // 6. Create Attendance Record
    const DEPT_SUBJECTS = {
      CSE: [
        { code: 'CS301', name: 'Data Structures & Algorithms', faculty: 'Dr. Anand Raman', credits: 4 },
        { code: 'CS302', name: 'Operating Systems & Concurrency', faculty: 'Prof. Meera Nair', credits: 4 },
        { code: 'CS303', name: 'Database Management Systems', faculty: 'Dr. Vikram Seth', credits: 4 },
        { code: 'CS304', name: 'Computer Networks & Security', faculty: 'Prof. Sunita Rao', credits: 3 },
        { code: 'CS305P', name: 'Advanced Systems Programming Lab', faculty: 'Dr. Anand Raman', credits: 2 },
      ],
      ECE: [
        { code: 'EC301', name: 'Signals & Systems Analysis', faculty: 'Dr. K. S. Murthy', credits: 4 },
        { code: 'EC302', name: 'Digital Signal Processing (DSP)', faculty: 'Prof. Arvind Swamy', credits: 4 },
        { code: 'EC303', name: 'Microcontrollers & Embedded Systems', faculty: 'Dr. Neha Kapoor', credits: 4 },
        { code: 'EC304', name: 'VLSI Circuit Design', faculty: 'Prof. Sanjay Verma', credits: 3 },
        { code: 'EC305P', name: 'Embedded & Microcontroller Lab', faculty: 'Dr. Neha Kapoor', credits: 2 },
      ],
      ME: [
        { code: 'ME301', name: 'Thermodynamics & Thermal Power', faculty: 'Dr. R. K. Bansal', credits: 4 },
        { code: 'ME302', name: 'Fluid Mechanics & Machinery', faculty: 'Prof. Deepak Singhania', credits: 4 },
        { code: 'ME303', name: 'Kinematics & Dynamics of Machines', faculty: 'Dr. Amit Trivedi', credits: 4 },
        { code: 'ME304', name: 'Manufacturing Processes & Metallurgy', faculty: 'Prof. Rajesh Khanna', credits: 3 },
        { code: 'ME305P', name: 'CAD/CAM Simulation & Machining Lab', faculty: 'Dr. Amit Trivedi', credits: 2 },
      ],
      CE: [
        { code: 'CE301', name: 'Structural Analysis & Design', faculty: 'Dr. B. C. Punmia', credits: 4 },
        { code: 'CE302', name: 'Geotechnical & Soil Engineering', faculty: 'Prof. Suresh Varma', credits: 4 },
        { code: 'CE303', name: 'Hydraulics & Water Resources Engg', faculty: 'Dr. Shalini Gupta', credits: 4 },
        { code: 'CE304', name: 'Surveying & Geomatics', faculty: 'Prof. Manoj Mishra', credits: 3 },
        { code: 'CE305P', name: 'Concrete Technology & Structures Lab', faculty: 'Dr. B. C. Punmia', credits: 2 },
      ],
    };

    const subList = DEPT_SUBJECTS[deptCode] || DEPT_SUBJECTS.CSE;

    await Attendance.create({
      student: student._id,
      semester: parseInt(currentSemester),
      academicYear: feeStructure.academicYear,
      subjects: subList.map((s) => ({
        subjectCode: s.code,
        subjectName: s.name,
        facultyName: s.faculty,
        credits: s.credits,
        totalClasses: 40,
        attendedClasses: 35,
      })),
    });

    // 7. Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'create_student_manual',
      targetEntity: `Student:${student.rollNumber}`,
      targetId: student._id,
      amountAffected: totalDemanded,
      reason: `Manual student onboarding (${student.name}, ${student.rollNumber})`,
      ipAddress: req.ip,
    });

    // Real-time update CSV roster file and Redis cache
    syncStudentsToCsv().catch((err) => console.error('CSV Sync Error:', err.message));
    syncStudentToRedis(student._id).catch((err) => console.error('Redis Sync Error:', err.message));

    return res.status(201).json({
      success: true,
      message: `Student ${student.name} (${student.rollNumber}) registered successfully!`,
      data: {
        student,
        demand,
        cautionMoney,
        derived: {
          branch: deptCode,
          year: derivedYear,
          semester: parsedSem,
          batch: finalBatch,
          academicYear: finalAcademicYear,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * updateStudentByAdmin — Admin/Superuser full update of student profile, contact details, academic placement, and status.
 */
export const updateStudentByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const {
      name,
      email,
      rollNumber,
      departmentId,
      batch,
      currentSemester,
      gender,
      dob,
      bloodGroup,
      phone,
      guardianName,
      guardianPhone,
      address,
      profilePhoto,
      emergencyContact,
      bio,
      isActive,
      password,
    } = req.body;

    // Check for email / rollNumber collision if changed
    if (email && email.toLowerCase().trim() !== student.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: student._id } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `Email '${email}' is already in use.` });
      }
      student.email = email.toLowerCase().trim();
    }

    if (rollNumber && rollNumber.trim() !== student.rollNumber) {
      const existingRoll = await User.findOne({ rollNumber: rollNumber.trim(), _id: { $ne: student._id } });
      if (existingRoll) {
        return res.status(400).json({ success: false, message: `Roll Number '${rollNumber}' is already in use.` });
      }
      student.rollNumber = rollNumber.trim();
    }

    if (name) student.name = name.trim();
    if (departmentId) student.department = departmentId;
    if (batch) student.batch = batch;
    if (currentSemester) student.currentSemester = parseInt(currentSemester);
    if (gender) student.gender = gender;
    if (dob !== undefined) student.dob = dob;
    if (bloodGroup !== undefined) student.bloodGroup = bloodGroup;
    if (phone !== undefined) student.phone = phone;
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    if (address !== undefined) student.address = address;
    if (bio !== undefined) student.bio = bio;
    if (profilePhoto !== undefined) student.profilePhoto = profilePhoto;
    if (emergencyContact !== undefined) student.emergencyContact = emergencyContact;
    if (isActive !== undefined) student.isActive = isActive;
    if (password && password.trim()) {
      student.passwordHash = password.trim();
    }

    await student.save();

    // If department or currentSemester changed, sync Attendance / Timetable mapping
    if (departmentId || currentSemester) {
      const targetSem = student.currentSemester;
      let att = await Attendance.findOne({ student: student._id });
      if (att) {
        att.semester = targetSem;
        await att.save();
      }
    }

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'update_student_profile',
      targetEntity: `Student:${student.rollNumber}`,
      targetId: student._id,
      reason: `Master student profile & settings updated by ${req.user.name}`,
      ipAddress: req.ip,
    });

    const updated = await User.findById(student._id).populate('department', 'name code');

    // Real-time update CSV roster file and Redis cache
    syncStudentsToCsv().catch((err) => console.error('CSV Sync Error:', err.message));
    syncStudentToRedis(student._id).catch((err) => console.error('Redis Sync Error:', err.message));

    return res.json({
      success: true,
      message: `Student profile for ${student.name} (${student.rollNumber}) updated successfully!`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * triggerMassDueReminders — Send real-time fee due reminders to all students with outstanding balances.
 */
export const triggerMassDueReminders = async (req, res, next) => {
  try {
    const result = await sendMassRealtimeFeeReminders(req.user);
    return res.json({
      success: true,
      message: `Real-time fee due reminders sent successfully to ${result.totalStudentsNotified} student(s) with outstanding dues!`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * triggerIndividualDueReminder — Send real-time fee due reminder to a single student.
 */
export const triggerIndividualDueReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const demands = await FeeDemand.find({
      student: student._id,
      status: { $in: ['pending', 'partial', 'overdue'] },
    }).lean();

    const totalOutstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
    const totalLateFee = demands.reduce((acc, d) => acc + (d.lateFeeAccrued || 0), 0);

    if (totalOutstanding <= 0 && totalLateFee <= 0) {
      return res.json({
        success: true,
        message: `Student ${student.name} (${student.rollNumber}) has ZERO outstanding dues (All Clear Verified). Reminder not required.`,
        data: { zeroDues: true, studentName: student.name, rollNumber: student.rollNumber },
      });
    }

    const reminder = await sendRealtimeFeeDueReminder({
      student,
      totalOutstanding,
      totalLateFee,
      demands,
    });

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'individual_fee_reminder_sent',
      targetEntity: `Student:${student.rollNumber}`,
      targetId: student._id,
      reason: `Real-time fee due reminder dispatched to ${student.name} (${student.email})`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Real-time fee due reminder dispatched to ${student.name} (${student.email})!`,
      data: reminder,
    });
  } catch (err) {
    next(err);
  }
};


