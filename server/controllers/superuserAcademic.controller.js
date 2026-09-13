import User from '../models/User.js';
import Department from '../models/Department.js';
import Timetable from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';
import FeeDemand from '../models/FeeDemand.js';

/**
 * Helper to resolve the department scope for the current superuser.
 * If branch superuser, locks to req.user.department.
 * If centralized superuser, defaults to query param or first department.
 */
const resolveDepartmentScope = async (user, requestedDeptId) => {
  if (user.department) {
    const dept = await Department.findById(user.department);
    return { deptId: user.department, isBranchScoped: true, dept };
  }
  if (requestedDeptId && requestedDeptId !== 'all') {
    const dept = await Department.findById(requestedDeptId);
    if (dept) return { deptId: dept._id, isBranchScoped: false, dept };
  }
  // Centralized Superuser fallback: return first active department
  const firstDept = await Department.findOne();
  return { deptId: firstDept ? firstDept._id : null, isBranchScoped: false, dept: firstDept };
};

/**
 * getSemesterStudents — Returns all students in the branch grouped/filtered semester-wise.
 */
export const getSemesterStudents = async (req, res, next) => {
  try {
    const { semester, departmentId, search } = req.query;
    const { deptId, isBranchScoped, dept } = await resolveDepartmentScope(req.user, departmentId);

    const filter = { role: 'student' };
    if (deptId) filter.department = deptId;
    if (semester && semester !== 'ALL') {
      filter.currentSemester = parseInt(semester);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(filter)
      .populate('department', 'name code')
      .select('name rollNumber email phone currentSemester academicYear status isDefaulter department avatarUrl createdAt')
      .sort({ currentSemester: 1, rollNumber: 1 })
      .lean();

    // Fetch financial dues and attendance percentages for these students
    const studentIds = students.map((s) => s._id);

    const [demands, attendances] = await Promise.all([
      FeeDemand.find({ student: { $in: studentIds } }).select('student outstandingAmount totalDemanded totalPaid status dueDate').lean(),
      Attendance.find({ student: { $in: studentIds } }).select('student overallPercentage hasShortage subjects').lean(),
    ]);

    const demandMap = new Map();
    demands.forEach((d) => {
      const sId = String(d.student);
      const bal = Number(d.outstandingAmount !== undefined ? d.outstandingAmount : 0);
      demandMap.set(sId, (demandMap.get(sId) || 0) + bal);
    });

    const attendanceMap = new Map();
    attendances.forEach((a) => {
      attendanceMap.set(String(a.student), a);
    });

    // Counts per semester (1 to 8) for tab badges
    const semesterCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    const allBranchStudents = await User.find({ role: 'student', ...(deptId ? { department: deptId } : {}) }).select('currentSemester').lean();
    allBranchStudents.forEach((s) => {
      if (s.currentSemester && semesterCounts[s.currentSemester] !== undefined) {
        semesterCounts[s.currentSemester]++;
      }
    });

    const enrichedStudents = students.map((s) => {
      const sId = String(s._id);
      const totalDue = demandMap.get(sId) || 0;
      const att = attendanceMap.get(sId);
      return {
        ...s,
        totalDue,
        hasDues: totalDue > 0,
        attendancePercentage: att ? att.overallPercentage : 85,
        hasShortage: att ? att.hasShortage : false,
        subjectCount: att?.subjects?.length || 0,
      };
    });

    return res.json({
      success: true,
      data: {
        department: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
        isBranchScoped,
        semesterCounts,
        totalStudents: enrichedStudents.length,
        students: enrichedStudents,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getSuperuserTimetable — Get timetable for a branch & semester.
 */
export const getSuperuserTimetable = async (req, res, next) => {
  try {
    const { semester = 1, departmentId } = req.query;
    const { deptId, isBranchScoped, dept } = await resolveDepartmentScope(req.user, departmentId);

    if (!deptId) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    let timetable = await Timetable.findOne({
      department: deptId,
      semester: parseInt(semester),
    }).populate('department', 'name code');

    // If no specific semester timetable exists, seed standard institutional schedule
    if (!timetable) {
      const deptCode = dept ? dept.code : 'GEN';
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const defaultSlots = [
        { slotNumber: 1, startTime: '08:00 AM', endTime: '09:00 AM', subjectCode: `${deptCode}-101`, subjectName: 'Core Foundations I', facultyName: 'Dr. V. Sharma', room: 'LH-101', type: 'lecture' },
        { slotNumber: 2, startTime: '09:05 AM', endTime: '10:05 AM', subjectCode: `${deptCode}-102`, subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Iyer', room: 'LH-101', type: 'lecture' },
        { slotNumber: 3, startTime: '10:10 AM', endTime: '11:10 AM', subjectCode: `${deptCode}-103`, subjectName: 'Domain Principles', facultyName: 'Dr. A. Verma', room: 'LH-101', type: 'lecture' },
        { slotNumber: 4, startTime: '12:00 PM', endTime: '01:00 PM', subjectCode: `${deptCode}-104`, subjectName: 'Practical Systems Lab', facultyName: 'Prof. S. Nair', room: 'Lab-A', type: 'lab' },
        { slotNumber: 5, startTime: '01:05 PM', endTime: '02:00 PM', subjectCode: `${deptCode}-105`, subjectName: 'Applied Technology', facultyName: 'Dr. K. Patel', room: 'LH-102', type: 'lecture' },
        { slotNumber: 6, startTime: '02:05 PM', endTime: '03:00 PM', subjectCode: `${deptCode}-106`, subjectName: 'Seminar & Tutorials', facultyName: 'Prof. M. Gupta', room: 'CR-204', type: 'tutorial' },
      ];

      const weeklySchedule = DAYS.map((day) => ({
        day,
        slots: defaultSlots,
      }));

      timetable = await Timetable.create({
        department: deptId,
        semester: parseInt(semester),
        academicYear,
        collegeHours: '08:00 AM - 03:00 PM',
        lunchBreak: '11:15 AM - 12:00 PM',
        weeklySchedule,
      });

      timetable = await timetable.populate('department', 'name code');
    }

    return res.json({
      success: true,
      data: {
        timetable,
        department: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
        isBranchScoped,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * saveSuperuserTimetable — Update weekly schedule for a department and semester.
 */
export const saveSuperuserTimetable = async (req, res, next) => {
  try {
    const { semester, departmentId, weeklySchedule } = req.body;
    const { deptId, isBranchScoped, dept } = await resolveDepartmentScope(req.user, departmentId);

    if (!deptId) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    const updated = await Timetable.findOneAndUpdate(
      { department: deptId, semester: parseInt(semester) },
      {
        $set: {
          weeklySchedule,
          academicYear,
          collegeHours: '08:00 AM - 03:00 PM',
          lunchBreak: '11:15 AM - 12:00 PM',
        },
      },
      { new: true, upsert: true }
    ).populate('department', 'name code');

    return res.json({
      success: true,
      message: `Timetable for ${dept?.name} Semester ${semester} updated successfully!`,
      data: {
        timetable: updated,
        department: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
        isBranchScoped,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getSuperuserAttendance — Department attendance roster by semester.
 */
export const getSuperuserAttendance = async (req, res, next) => {
  try {
    const { semester = 1, departmentId } = req.query;
    const { deptId, isBranchScoped, dept } = await resolveDepartmentScope(req.user, departmentId);

    const filter = { role: 'student' };
    if (deptId) filter.department = deptId;
    if (semester && semester !== 'ALL') filter.currentSemester = parseInt(semester);

    const students = await User.find(filter)
      .populate('department', 'name code')
      .select('name rollNumber email currentSemester department')
      .sort({ rollNumber: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // Fetch existing attendance records
    const attendanceRecords = await Attendance.find({ student: { $in: studentIds } }).lean();
    const attMap = new Map();
    attendanceRecords.forEach((a) => attMap.set(String(a.student), a));

    // For any student lacking an attendance record, create standard baseline
    const deptCode = dept ? dept.code : 'GEN';
    const enrichedList = [];

    for (const student of students) {
      let record = attMap.get(String(student._id));
      if (!record) {
        const defaultSubjects = [
          { subjectCode: `${deptCode}-101`, subjectName: 'Core Foundations I', facultyName: 'Dr. V. Sharma', credits: 4, totalClasses: 40, attendedClasses: 34 },
          { subjectCode: `${deptCode}-102`, subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Iyer', credits: 4, totalClasses: 40, attendedClasses: 32 },
          { subjectCode: `${deptCode}-103`, subjectName: 'Domain Principles', facultyName: 'Dr. A. Verma', credits: 3, totalClasses: 36, attendedClasses: 30 },
          { subjectCode: `${deptCode}-104`, subjectName: 'Practical Systems Lab', facultyName: 'Prof. S. Nair', credits: 2, totalClasses: 24, attendedClasses: 22 },
        ];

        const newAtt = new Attendance({
          student: student._id,
          semester: student.currentSemester || 1,
          academicYear: '2025-2026',
          subjects: defaultSubjects,
        });
        await newAtt.save();
        record = newAtt.toObject();
      }

      enrichedList.push({
        student,
        attendance: record,
      });
    }

    // Metric summaries
    const totalStudents = enrichedList.length;
    const shortageCount = enrichedList.filter((item) => item.attendance.hasShortage || item.attendance.overallPercentage < 75).length;
    const safeCount = totalStudents - shortageCount;
    const avgPercentage = totalStudents > 0
      ? (enrichedList.reduce((acc, curr) => acc + (curr.attendance.overallPercentage || 0), 0) / totalStudents).toFixed(1)
      : 0;

    return res.json({
      success: true,
      data: {
        department: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
        isBranchScoped,
        semester: parseInt(semester),
        metrics: {
          totalStudents,
          shortageCount,
          safeCount,
          avgPercentage: parseFloat(avgPercentage),
        },
        roster: enrichedList,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * updateSuperuserAttendance — Update attendance record for a student.
 */
export const updateSuperuserAttendance = async (req, res, next) => {
  try {
    const { studentId, subjectCode, attendedClasses, totalClasses } = req.body;

    if (!studentId || !subjectCode) {
      return res.status(400).json({ success: false, message: 'studentId and subjectCode are required.' });
    }

    let record = await Attendance.findOne({ student: studentId });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const sub = record.subjects.find((s) => s.subjectCode === subjectCode);
    if (!sub) {
      return res.status(404).json({ success: false, message: `Subject ${subjectCode} not found in student roster.` });
    }

    if (totalClasses !== undefined) sub.totalClasses = parseInt(totalClasses);
    if (attendedClasses !== undefined) sub.attendedClasses = Math.min(parseInt(attendedClasses), sub.totalClasses);

    await record.save();

    return res.json({
      success: true,
      message: `Attendance for ${subjectCode} updated successfully.`,
      data: record,
    });
  } catch (err) {
    next(err);
  }
};
