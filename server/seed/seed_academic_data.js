import mongoose from 'mongoose';
import '../models/index.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Timetable from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';

const DEPT_SUBJECTS = {
  CSE: [
    { code: 'CS301', name: 'Data Structures & Algorithms', faculty: 'Dr. Anand Raman', credits: 4, lab: false },
    { code: 'CS302', name: 'Operating Systems & Concurrency', faculty: 'Prof. Meera Nair', credits: 4, lab: false },
    { code: 'CS303', name: 'Database Management Systems', faculty: 'Dr. Vikram Seth', credits: 4, lab: false },
    { code: 'CS304', name: 'Computer Networks & Security', faculty: 'Prof. Sunita Rao', credits: 3, lab: false },
    { code: 'CS305P', name: 'Advanced Systems Programming Lab', faculty: 'Dr. Anand Raman', credits: 2, lab: true },
  ],
  ECE: [
    { code: 'EC301', name: 'Signals & Systems Analysis', faculty: 'Dr. K. S. Murthy', credits: 4, lab: false },
    { code: 'EC302', name: 'Digital Signal Processing (DSP)', faculty: 'Prof. Arvind Swamy', credits: 4, lab: false },
    { code: 'EC303', name: 'Microcontrollers & Embedded Systems', faculty: 'Dr. Neha Kapoor', credits: 4, lab: false },
    { code: 'EC304', name: 'VLSI Circuit Design', faculty: 'Prof. Sanjay Verma', credits: 3, lab: false },
    { code: 'EC305P', name: 'Embedded & Microcontroller Lab', faculty: 'Dr. Neha Kapoor', credits: 2, lab: true },
  ],
  ME: [
    { code: 'ME301', name: 'Thermodynamics & Thermal Power', faculty: 'Dr. R. K. Bansal', credits: 4, lab: false },
    { code: 'ME302', name: 'Fluid Mechanics & Machinery', faculty: 'Prof. Deepak Singhania', credits: 4, lab: false },
    { code: 'ME303', name: 'Kinematics & Dynamics of Machines', faculty: 'Dr. Amit Trivedi', credits: 4, lab: false },
    { code: 'ME304', name: 'Manufacturing Processes & Metallurgy', faculty: 'Prof. Rajesh Khanna', credits: 3, lab: false },
    { code: 'ME305P', name: 'CAD/CAM Simulation & Machining Lab', faculty: 'Dr. Amit Trivedi', credits: 2, lab: true },
  ],
  CE: [
    { code: 'CE301', name: 'Structural Analysis & Design', faculty: 'Dr. B. C. Punmia', credits: 4, lab: false },
    { code: 'CE302', name: 'Geotechnical & Soil Engineering', faculty: 'Prof. Suresh Varma', credits: 4, lab: false },
    { code: 'CE303', name: 'Hydraulics & Water Resources Engg', faculty: 'Dr. Shalini Gupta', credits: 4, lab: false },
    { code: 'CE304', name: 'Surveying & Geomatics', faculty: 'Prof. Manoj Mishra', credits: 3, lab: false },
    { code: 'CE305P', name: 'Concrete Technology & Structures Lab', faculty: 'Dr. B. C. Punmia', credits: 2, lab: true },
  ],
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateWeeklySchedule(subjects, deptCode) {
  return DAYS.map((day, dayIndex) => {
    // 6 slots per day:
    // Slot 1: 08:00 - 09:00
    // Slot 2: 09:00 - 10:00
    // Slot 3: 10:00 - 11:15
    // [LUNCH: 11:15 - 12:00]
    // Slot 4: 12:00 - 01:00
    // Slot 5: 01:00 - 02:00
    // Slot 6: 02:00 - 03:00

    const slots = [
      {
        slotNumber: 1,
        startTime: '08:00 AM',
        endTime: '09:00 AM',
        subjectCode: subjects[dayIndex % 4].code,
        subjectName: subjects[dayIndex % 4].name,
        facultyName: subjects[dayIndex % 4].faculty,
        room: `${deptCode}-LH-${101 + (dayIndex % 3)}`,
        type: 'lecture',
      },
      {
        slotNumber: 2,
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        subjectCode: subjects[(dayIndex + 1) % 4].code,
        subjectName: subjects[(dayIndex + 1) % 4].name,
        facultyName: subjects[(dayIndex + 1) % 4].faculty,
        room: `${deptCode}-LH-${101 + ((dayIndex + 1) % 3)}`,
        type: 'lecture',
      },
      {
        slotNumber: 3,
        startTime: '10:00 AM',
        endTime: '11:15 AM',
        subjectCode: subjects[(dayIndex + 2) % 4].code,
        subjectName: subjects[(dayIndex + 2) % 4].name,
        facultyName: subjects[(dayIndex + 2) % 4].faculty,
        room: `${deptCode}-LH-${101 + ((dayIndex + 2) % 3)}`,
        type: 'lecture',
      },
      // Note: Lunch Break is from 11:15 AM to 12:00 PM
      {
        slotNumber: 4,
        startTime: '12:00 PM',
        endTime: '01:00 PM',
        subjectCode: subjects[(dayIndex + 3) % 4].code,
        subjectName: subjects[(dayIndex + 3) % 4].name,
        facultyName: subjects[(dayIndex + 3) % 4].faculty,
        room: `${deptCode}-LH-${101 + ((dayIndex + 3) % 3)}`,
        type: 'lecture',
      },
      {
        slotNumber: 5,
        startTime: '01:00 PM',
        endTime: '02:00 PM',
        subjectCode: subjects[dayIndex % 2 === 0 ? 0 : 1].code,
        subjectName: subjects[dayIndex % 2 === 0 ? 0 : 1].name,
        facultyName: subjects[dayIndex % 2 === 0 ? 0 : 1].faculty,
        room: `${deptCode}-LH-201`,
        type: 'tutorial',
      },
      {
        slotNumber: 6,
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        subjectCode: subjects[4].code, // Lab
        subjectName: subjects[4].name,
        facultyName: subjects[4].faculty,
        room: `${deptCode}-Lab ${1 + (dayIndex % 2)}`,
        type: 'lab',
      },
    ];

    return { day, slots };
  });
}

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  // 1. Wipe and re-seed Timetables
  await Timetable.deleteMany({});
  console.log('Cleaned old timetables.');

  const departments = await Department.find();
  for (const dept of departments) {
    const subjects = DEPT_SUBJECTS[dept.code] || DEPT_SUBJECTS.CSE;
    
    // Seed for semesters 1 through 8
    for (const sem of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const weeklySchedule = generateWeeklySchedule(subjects, dept.code);
      await Timetable.create({
        department: dept._id,
        semester: sem,
        academicYear: '2025-26',
        collegeHours: '08:00 AM - 03:00 PM',
        lunchBreak: '11:15 AM - 12:00 PM',
        weeklySchedule,
      });
    }
  }
  console.log('Seeded Timetables for CSE, ECE, ME, CE across semesters.');

  // 2. Wipe and re-seed Attendance for all 12 students
  await Attendance.deleteMany({});
  console.log('Cleaned old attendance records.');

  const students = await User.find({ role: 'student' }).populate('department');

  // Attendance profiles for diversity (some high attendance, some average, some with shortage < 75%)
  const ATTENDANCE_PROFILES = [
    // 1. High Performer (All >= 85%)
    [
      { total: 42, attended: 39 }, // 92.9%
      { total: 40, attended: 36 }, // 90.0%
      { total: 38, attended: 34 }, // 89.5%
      { total: 44, attended: 38 }, // 86.4%
      { total: 20, attended: 19 }, // 95.0% (Lab)
    ],
    // 2. Solid Student with 1 subject shortage (< 75%)
    [
      { total: 42, attended: 35 }, // 83.3%
      { total: 40, attended: 32 }, // 80.0%
      { total: 40, attended: 27 }, // 67.5% - SHORTAGE!
      { total: 44, attended: 36 }, // 81.8%
      { total: 20, attended: 18 }, // 90.0% (Lab)
    ],
    // 3. At Risk / Defaulter profile (Multiple shortages < 75%)
    [
      { total: 42, attended: 28 }, // 66.7% - SHORTAGE!
      { total: 40, attended: 26 }, // 65.0% - SHORTAGE!
      { total: 38, attended: 31 }, // 81.6%
      { total: 44, attended: 29 }, // 65.9% - SHORTAGE!
      { total: 20, attended: 14 }, // 70.0% - SHORTAGE!
    ],
  ];

  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const deptCode = s.department?.code || 'CSE';
    const subjectsList = DEPT_SUBJECTS[deptCode] || DEPT_SUBJECTS.CSE;

    // Pick profile based on student status or index:
    // Index 0, 3, 6, 9 (Paid) -> High
    // Index 1, 4, 7, 10 (Pending) -> 1 Shortage
    // Index 2, 5, 8, 11 (Defaulters) -> Defaulter / Multiple Shortage
    const profileIdx = idx % 3;
    const profile = ATTENDANCE_PROFILES[profileIdx];

    const studentSubjects = subjectsList.map((sub, sIdx) => {
      const stats = profile[sIdx] || { total: 40, attended: 32 };
      return {
        subjectCode: sub.code,
        subjectName: sub.name,
        facultyName: sub.faculty,
        credits: sub.credits,
        totalClasses: stats.total,
        attendedClasses: stats.attended,
      };
    });

    const att = new Attendance({
      student: s._id,
      semester: s.currentSemester || 1,
      academicYear: '2025-26',
      subjects: studentSubjects,
    });
    await att.save();
  }

  const attCount = await Attendance.countDocuments();
  console.log(`Seeded Attendance records for ${attCount} students with 75% calculations.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
