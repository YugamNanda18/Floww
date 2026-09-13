import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Department from '../models/Department.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';
import Attendance from '../models/Attendance.js';
import Timetable from '../models/Timetable.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx';

async function seedMasterSync() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to:', mongoose.connection.name);

  const passwordHash = await bcrypt.hash('admin123', 10);
  const studentPasswordHash = await bcrypt.hash('demo123', 10);

  // 1. Ensure Standard Departments
  const standardDepts = [
    { name: 'Computer Science and Engineering', code: 'CSE', annualFee: 110000 },
    { name: 'Electronics and Communication Engineering', code: 'ECE', annualFee: 102000 },
    { name: 'Mechanical Engineering', code: 'ME', annualFee: 95000 },
    { name: 'Civil Engineering', code: 'CE', annualFee: 90000 },
  ];

  const deptMap = {};
  for (const d of standardDepts) {
    let doc = await Department.findOne({ code: d.code });
    if (!doc) {
      doc = await Department.create({
        name: d.name,
        code: d.code,
        annualFee: d.annualFee,
        isActive: true,
      });
      console.log(`Created Department: ${d.code}`);
    }
    deptMap[d.code] = doc;
  }

  // 2. Ensure Main Admin (ADM001) and Secondary Admin (ADM002)
  await User.updateOne(
    { employeeId: 'ADM001' },
    {
      $set: {
        name: 'Rajesh Kumar (Main Admin / CFO)',
        email: 'admin@demo.com',
        employeeId: 'ADM001',
        passwordHash,
        role: 'admin',
        department: null,
        isActive: true,
        phone: '+91 98765 00001',
      },
    },
    { upsert: true }
  );
  console.log('✅ Main Admin (ADM001): admin@demo.com / admin123');

  await User.updateOne(
    { employeeId: 'ADM002' },
    {
      $set: {
        name: 'Priya Sharma (Finance Officer)',
        email: 'admin.finance@demo.com',
        employeeId: 'ADM002',
        passwordHash,
        role: 'admin',
        department: null,
        isActive: true,
        phone: '+91 98765 00002',
      },
    },
    { upsert: true }
  );
  console.log('✅ Secondary Admin (ADM002): admin.finance@demo.com / admin123');

  // 3. Ensure Centralized Superuser (SUP001)
  await User.updateOne(
    { employeeId: 'SUP001' },
    {
      $set: {
        name: 'Dr. Sita Rao (Centralized Dean / Superuser)',
        email: 'super@demo.com',
        employeeId: 'SUP001',
        passwordHash,
        role: 'superuser',
        department: null, // Dean has institutional access
        isActive: true,
        phone: '+91 98765 10001',
      },
    },
    { upsert: true }
  );
  console.log('✅ Centralized Superuser (SUP001): super@demo.com / admin123');

  // 4. Ensure Branch-Specific Superusers for each Department
  const branchSuperusers = [
    {
      code: 'CSE',
      empId: 'SUP-CSE',
      name: 'Prof. Arvind Menon (CSE Head)',
      email: 'super.cse@demo.com',
      phone: '+91 98765 20001',
    },
    {
      code: 'ECE',
      empId: 'SUP-ECE',
      name: 'Prof. Ananya Sen (ECE Head)',
      email: 'super.ece@demo.com',
      phone: '+91 98765 20002',
    },
    {
      code: 'ME',
      empId: 'SUP-ME',
      name: 'Prof. Vikram Rathore (ME Head)',
      email: 'super.me@demo.com',
      phone: '+91 98765 20003',
    },
    {
      code: 'CE',
      empId: 'SUP-CE',
      name: 'Prof. Sunita Deshmukh (CE Head)',
      email: 'super.ce@demo.com',
      phone: '+91 98765 20004',
    },
  ];

  for (const b of branchSuperusers) {
    const dept = deptMap[b.code];
    await User.updateOne(
      { employeeId: b.empId },
      {
        $set: {
          name: b.name,
          email: b.email,
          employeeId: b.empId,
          passwordHash,
          role: 'superuser',
          department: dept._id,
          isActive: true,
          phone: b.phone,
        },
      },
      { upsert: true }
    );
    console.log(`✅ Branch Superuser (${b.empId}): ${b.email} / admin123 [Dept: ${b.code}]`);
  }

  // 5. Seed Attendance records for all students if missing
  const students = await User.find({ role: 'student' });
  console.log(`Found ${students.length} students in database.`);

  for (const s of students) {
    const existingAtt = await Attendance.findOne({ student: s._id });
    if (!existingAtt) {
      // Determine if defaulter or regular based on roll number
      const isDefaulter = ['CSE2303', 'ECE2403', 'ME2303', 'CE2403'].includes(s.rollNumber);
      const attended = isDefaulter ? 44 : 58;
      const total = 65;
      const subjects = [
        {
          subjectCode: `${s.department ? 'ENG' : 'GEN'}101`,
          subjectName: 'Core Engineering Systems',
          totalClasses: 35,
          attendedClasses: isDefaulter ? 22 : 32,
        },
        {
          subjectCode: `${s.department ? 'ENG' : 'GEN'}102`,
          subjectName: 'Applied Mathematics & Algorithms',
          totalClasses: 30,
          attendedClasses: isDefaulter ? 22 : 26,
        },
      ];

      await Attendance.create({
        student: s._id,
        department: s.department || deptMap['CSE']._id,
        semester: s.currentSemester || 1,
        academicYear: s.batch || '2025-2029',
        totalClasses: total,
        attendedClasses: attended,
        overallPercentage: Math.round((attended / total) * 100),
        subjects,
      });
      console.log(`Initialized Attendance for student ${s.rollNumber}`);
    }
  }

  console.log('\n=============================================');
  console.log('🎉 MASTER SEED & SYNC COMPLETED SUCCESSFULLY!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seedMasterSync().catch((err) => {
  console.error('Master seed failed:', err);
  process.exit(1);
});
