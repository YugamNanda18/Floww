import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import '../models/index.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import FeeStructure from '../models/FeeStructure.js';
import FeeDemand from '../models/FeeDemand.js';
import Transaction from '../models/Transaction.js';
import Receipt from '../models/Receipt.js';
import Timetable from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';
import LateFeeRule from '../models/LateFeeRule.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import CautionMoney from '../models/CautionMoney.js';
import LedgerEntry from '../models/LedgerEntry.js';

import { postDoubleEntry } from '../services/ledger.service.js';

const DEMO_PASSWORD_HASH = await bcrypt.hash('demo123', 10);
const ADMIN_PASSWORD_HASH = await bcrypt.hash('admin123', 10);

function paise(rupees) {
  return Math.round(rupees * 100);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFrom(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function runMasterSeed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ledgerx';
  await mongoose.connect(uri);
  console.log('🚀 Connected to MongoDB for Master Reseed...');

  // 1. CLEAR ALL COLLECTIONS
  await User.deleteMany({});
  await Department.deleteMany({});
  await FeeStructure.deleteMany({});
  await FeeDemand.deleteMany({});
  await Transaction.deleteMany({});
  await Receipt.deleteMany({});
  await Timetable.deleteMany({});
  await Attendance.deleteMany({});
  await LateFeeRule.deleteMany({});
  await InstallmentPlan.deleteMany({});
  await CautionMoney.deleteMany({});
  await LedgerEntry.deleteMany({});
  console.log('🧹 Wiped existing database collections clean.');

  // 2. CREATE DEPARTMENTS
  const deptsData = [
    { name: 'Computer Science & Engineering', code: 'CSE', feePerSemester: 110000 },
    { name: 'Electronics & Communication Engg', code: 'ECE', feePerSemester: 102000 },
    { name: 'Mechanical Engineering', code: 'ME', feePerSemester: 95000 },
    { name: 'Civil Engineering', code: 'CE', feePerSemester: 102000 },
  ];
  const depts = {};
  for (const d of deptsData) {
    const doc = await Department.create({ ...d, totalSemesters: 8, isActive: true });
    depts[d.code] = doc;
  }
  console.log('✅ Departments created (CSE, ECE, ME, CE).');

  // 3. CREATE DEFAULT FEE STRUCTURE & LATE FEE RULE
  const defaultFS = await FeeStructure.create({
    department: depts['CSE']._id,
    batch: '2025-2029',
    semester: 1,
    academicYear: '2025-26',
    dueDate: daysFrom(30),
    totalAmount: paise(110000),
    components: [
      { name: 'Tuition', amount: paise(77000) },
      { name: 'Development', amount: paise(16500) },
      { name: 'Library', amount: paise(11000) },
      { name: 'Exam', amount: paise(5500) },
    ],
    isPublished: true,
    isActive: true,
  });

  const lateRule = await LateFeeRule.create({
    feeStructure: defaultFS._id,
    name: 'Standard Daily 0.1% Penalty',
    ruleType: 'dailyPercentage',
    dailyRate: 0.1,
    maxCap: paise(10000),
    effectiveAfterDays: 0,
    description: 'Standard 0.1% daily penalty after due date',
    isActive: true,
  });

  // 4. CREATE STAFF USERS
  const adminUser = await User.create({
    name: 'Rajesh Kumar (Admin)',
    email: 'admin@demo.com',
    employeeId: 'ADM001',
    passwordHash: ADMIN_PASSWORD_HASH,
    role: 'admin',
    gender: 'male',
    phone: '+91 99000 11223',
    profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    bio: 'Senior Finance Administrator overseeing counter collections, fee verification, and reconciliation.',
    isActive: true,
  });

  const superUser = await User.create({
    name: 'Dr. Sita Rao (Superuser)',
    email: 'super@demo.com',
    employeeId: 'SUP001',
    passwordHash: ADMIN_PASSWORD_HASH,
    role: 'superuser',
    gender: 'female',
    phone: '+91 99000 33445',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    bio: 'Chief Bursar & Registrar managing institutional fee policies, bulk structures, and scholarships.',
    isActive: true,
  });
  console.log('✅ Staff users created: ADM001 (Admin) & SUP001 (Superuser).');

  // 5. DEFINITION OF THE 12 CSV STUDENTS WITH PROFILES
  const studentsList = [
    // CSE
    {
      dept: 'CSE', name: 'Rahul Sharma', email: 'student@demo.com', roll: 'CSE2501', sem: 1, year: 1, batch: '2025-2029', acadYear: '2025-26', status: 'Paid', totalFees: 110000,
      gender: 'male', dob: '2006-08-14', bloodGroup: 'O+', phone: '+91 98101 23456', guardianName: 'Ramesh Sharma', guardianPhone: '+91 98101 98765', address: 'Flat 402, Shivalik Residency, Sector 62, Noida, UP - 201301',
      bio: 'B.Tech CSE student (Sem 1) interested in Data Structures, Web Development, and Competitive Coding.',
      profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'CSE', name: 'Aarav Gupta', email: 'cse.pending@demo.com', roll: 'CSE2502', sem: 1, year: 1, batch: '2025-2029', acadYear: '2025-26', status: 'Pending', totalFees: 110000,
      gender: 'male', dob: '2006-11-22', bloodGroup: 'B+', phone: '+91 98202 34567', guardianName: 'Sunil Gupta', guardianPhone: '+91 98202 87654', address: 'B-12, Mayur Vihar Phase 1, New Delhi - 110091',
      bio: 'Freshman CSE engineer passionate about Machine Learning algorithms and open-source software.',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'CSE', name: 'Rohit Gupta', email: 'rohit@demo.com', roll: 'CSE2303', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Defaulter', totalFees: 95000,
      gender: 'male', dob: '2004-05-18', bloodGroup: 'A+', phone: '+91 98303 45678', guardianName: 'Alok Gupta', guardianPhone: '+91 98303 76543', address: 'Pocket 3, DDA SFS Flats, Dwarka Sector 11, New Delhi - 110075',
      bio: '3rd Year Computer Science student building full-stack applications and high-throughput backend microservices.',
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },

    // ECE
    {
      dept: 'ECE', name: 'Varun Dhawan', email: 'ece.paid@demo.com', roll: 'ECE2401', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Paid', totalFees: 102000,
      gender: 'male', dob: '2005-09-02', bloodGroup: 'AB+', phone: '+91 98404 56789', guardianName: 'David Dhawan', guardianPhone: '+91 98404 65432', address: '45/2, Green Glen Layout, Bellandur, Bengaluru, KA - 560103',
      bio: '2nd Year ECE student focusing on Embedded Systems, IoT architecture, and digital signal processing.',
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'ECE', name: 'Ritika Sen', email: 'ece.pending@demo.com', roll: 'ECE2402', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Pending', totalFees: 102000,
      gender: 'female', dob: '2005-03-27', bloodGroup: 'O+', phone: '+91 98505 67890', guardianName: 'Subhash Sen', guardianPhone: '+91 98505 54321', address: '7th Cross, Indiranagar Stage 2, Bengaluru, KA - 560038',
      bio: 'ECE undergraduate passionate about VLSI design, semiconductor devices, and robotic automation.',
      profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'ECE', name: 'Karan Joshi', email: 'karan@demo.com', roll: 'ECE2403', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Defaulter', totalFees: 102000,
      gender: 'male', dob: '2005-12-10', bloodGroup: 'B+', phone: '+91 98606 78901', guardianName: 'Prakash Joshi', guardianPhone: '+91 98606 43210', address: 'House 88, Vasant Vihar, Dehradun, UK - 248006',
      bio: 'Electronics enthusiast exploring wireless communications, RF circuits, and antenna modeling.',
      profilePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    },

    // ME
    {
      dept: 'ME', name: 'Sameer Khan', email: 'me.paid@demo.com', roll: 'ME2301', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Paid', totalFees: 95000,
      gender: 'male', dob: '2004-07-21', bloodGroup: 'O-', phone: '+91 98707 89012', guardianName: 'Tariq Khan', guardianPhone: '+91 98707 32109', address: '22/A, Civil Lines, Jaipur, RJ - 302006',
      bio: 'Senior Mechanical Engineering student specialized in CAD/CAM modeling, CFD analysis, and automotive design.',
      profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'ME', name: 'Pooja Bhatia', email: 'me.pending@demo.com', roll: 'ME2302', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Pending', totalFees: 95000,
      gender: 'female', dob: '2004-10-15', bloodGroup: 'A+', phone: '+91 98808 90123', guardianName: 'Anil Bhatia', guardianPhone: '+91 98808 21098', address: 'C-34, Model Town, Ludhiana, PB - 141002',
      bio: 'Mechanical engineer pursuing research in sustainable thermal systems, renewable energy, and robotics.',
      profilePhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'ME', name: 'Sanjay Iyer', email: 'sanjay@demo.com', roll: 'ME2303', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Defaulter', totalFees: 95000,
      gender: 'male', dob: '2004-01-30', bloodGroup: 'B-', phone: '+91 98909 01234', guardianName: 'Venkatesh Iyer', guardianPhone: '+91 98909 10987', address: '14/3, R.A. Puram, Chennai, TN - 600028',
      bio: 'Mechanical Engineering senior exploring Mechatronics, industrial additive manufacturing, and FEA simulations.',
      profilePhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    },

    // CE
    {
      dept: 'CE', name: 'Rajesh Koothrappali', email: 'ce.paid@demo.com', roll: 'CE2401', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Paid', totalFees: 102000,
      gender: 'male', dob: '2005-04-11', bloodGroup: 'O+', phone: '+91 98010 12345', guardianName: 'Dr. V.M. Koothrappali', guardianPhone: '+91 98010 98760', address: '71, South Extension Part 2, New Delhi - 110049',
      bio: 'Civil Engineering student passionate about structural engineering, earthquake resilience, and smart city infrastructure.',
      profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'CE', name: 'Alia Bhatt', email: 'ce.pending@demo.com', roll: 'CE2402', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Pending', totalFees: 102000,
      gender: 'female', dob: '2005-06-25', bloodGroup: 'A+', phone: '+91 98111 23456', guardianName: 'Mahesh Bhatt', guardianPhone: '+91 98111 87654', address: 'Bandra West, Hill Road, Mumbai, MH - 400050',
      bio: 'Civil Engineering undergraduate focusing on environmental engineering, geotechnical analysis, and GIS mapping.',
      profilePhoto: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    },
    {
      dept: 'CE', name: 'Geeta Bhat', email: 'geeta@demo.com', roll: 'CE2403', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Defaulter', totalFees: 102000,
      gender: 'female', dob: '2005-08-09', bloodGroup: 'AB+', phone: '+91 98222 34567', guardianName: 'Kishore Bhat', guardianPhone: '+91 98222 76543', address: 'Shivaji Nagar, Pune, MH - 411005',
      bio: 'Aspiring transportation engineer studying sustainable urban mobility, highway materials, and hydrology.',
      profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const studentDocs = {};

  for (const s of studentsList) {
    const deptDoc = depts[s.dept];

    // Ensure Fee Structures exist for all semesters 1..s.sem
    for (let sem = 1; sem <= s.sem; sem++) {
      let fs = await FeeStructure.findOne({ department: deptDoc._id, semester: sem, batch: s.batch });
      if (!fs) {
        fs = await FeeStructure.create({
          department: deptDoc._id,
          batch: s.batch,
          semester: sem,
          academicYear: sem <= 2 ? '2023-24' : sem <= 4 ? '2024-25' : '2025-26',
          dueDate: daysFrom(30),
          totalAmount: paise(s.totalFees),
          components: [
            { name: 'Tuition', amount: paise(s.totalFees * 0.70) },
            { name: 'Development', amount: paise(s.totalFees * 0.15) },
            { name: 'Library', amount: paise(s.totalFees * 0.10) },
            { name: 'Exam', amount: paise(s.totalFees * 0.05) },
          ],
          isPublished: true,
          isActive: true,
        });
      }
    }

    // Create Student User
    const user = await User.create({
      name: s.name,
      email: s.email,
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'student',
      rollNumber: s.roll,
      department: deptDoc._id,
      batch: s.batch,
      currentSemester: s.sem,
      gender: s.gender,
      dob: s.dob,
      bloodGroup: s.bloodGroup,
      phone: s.phone,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      address: s.address,
      bio: s.bio,
      profilePhoto: s.profilePhoto,
      isActive: true,
    });
    studentDocs[s.roll] = user;

    // Create current semester Fee Demand
    const fsCurrent = await FeeStructure.findOne({ department: deptDoc._id, semester: s.sem, batch: s.batch });
    const totalPaise = fsCurrent.totalAmount;
    let dueDate = daysFrom(20);
    let totalPaid = 0;
    let outstanding = totalPaise;
    let lateFeeAccrued = 0;
    let demandStatus = 'pending';

    const components = fsCurrent.components.map(c => ({
      name: c.name,
      demandedAmount: c.amount,
      paidAmount: 0,
      waivedAmount: 0,
      status: 'pending',
    }));

    if (s.status === 'Paid') {
      demandStatus = 'paid';
      dueDate = daysAgo(15);
      totalPaid = totalPaise;
      outstanding = 0;
      components.forEach(c => {
        c.paidAmount = c.demandedAmount;
        c.status = 'paid';
      });
    } else if (s.status === 'Pending') {
      demandStatus = 'pending';
      dueDate = daysFrom(20);
      totalPaid = 0;
      outstanding = totalPaise;
    } else if (s.status === 'Defaulter') {
      demandStatus = 'overdue';
      dueDate = daysAgo(45);
      totalPaid = 0;
      outstanding = totalPaise;
      lateFeeAccrued = paise(1500);
    }

    const currentDemand = await FeeDemand.create({
      student: user._id,
      feeStructure: fsCurrent._id,
      semester: s.sem,
      academicYear: s.acadYear,
      dueDate,
      components,
      totalDemanded: totalPaise,
      totalPaid,
      totalWaived: 0,
      outstandingAmount: outstanding,
      lateFeeAccrued,
      lateFeeRule: lateRule._id,
      scholarshipAmount: 0,
      status: demandStatus,
    });

    // Journal Entry for current semester assessment
    await postDoubleEntry({
      debitAccount: 'Student Fee Receivable',
      creditAccount: 'Tuition Fee Revenue',
      amount: totalPaise,
      narration: `Semester ${s.sem} Fee Demand Assessment — ${s.name} (${s.roll})`,
      studentId: user._id,
      demandId: currentDemand._id,
    });

    // If current semester is Paid, generate payment & receipt
    if (s.status === 'Paid') {
      const txn = await Transaction.create({
        idempotencyKey: `curr-paid-${s.roll}-sem${s.sem}`,
        amount: totalPaise,
        currency: 'INR',
        method: 'upi',
        status: 'captured',
        student: user._id,
        demand: currentDemand._id,
        razorpayPaymentId: `pay_online_${s.roll}_s${s.sem}`,
        capturedAt: daysAgo(10),
      });

      const receiptNumber = `REC-${s.roll}-S${s.sem}`;
      const hash = crypto.createHash('sha256').update(`${receiptNumber}-${user._id}-${totalPaise}`).digest('hex');
      await Receipt.create({
        receiptNumber,
        transaction: txn._id,
        student: user._id,
        demand: currentDemand._id,
        amountPaid: totalPaise,
        components: currentDemand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
        paymentMethod: 'upi',
        paymentReference: txn.razorpayPaymentId,
        academicYear: s.acadYear,
        semester: s.sem,
        sha256Hash: hash,
        issuedAt: daysAgo(10),
      });

      await postDoubleEntry({
        debitAccount: 'Bank Operating Account',
        creditAccount: 'Student Fee Receivable',
        amount: totalPaise,
        narration: `Semester ${s.sem} Settlement Receipt ${receiptNumber}`,
        studentId: user._id,
        demandId: currentDemand._id,
        transactionId: txn._id,
        postedBy: adminUser._id,
        postedByLabel: adminUser.name,
      });
    }

    // PAST SEMESTERS GENERATION (for students in Sem 2, 3, 5, etc.)
    if (s.sem > 1) {
      for (let prevSem = 1; prevSem < s.sem; prevSem++) {
        const fsPast = await FeeStructure.findOne({ department: deptDoc._id, semester: prevSem, batch: s.batch })
          || fsCurrent;

        const pastTotalPaise = fsPast.totalAmount;
        const monthsAgo = (s.sem - prevSem) * 6;
        const pastDueDate = daysAgo(monthsAgo * 30);
        const pastPayDate = daysAgo(monthsAgo * 30 + 5);
        const pastAcadYear = prevSem <= 2 ? '2023-24' : '2024-25';

        const pastDemand = await FeeDemand.create({
          student: user._id,
          feeStructure: fsPast._id,
          semester: prevSem,
          academicYear: pastAcadYear,
          dueDate: pastDueDate,
          totalDemanded: pastTotalPaise,
          totalPaid: pastTotalPaise,
          outstandingAmount: 0,
          lateFeeAccrued: 0,
          status: 'paid',
          components: fsPast.components.map(c => ({
            name: c.name,
            demandedAmount: c.amount,
            paidAmount: c.amount,
            status: 'paid',
          })),
        });

        const methods = ['upi', 'netbanking', 'card', 'offline_dd'];
        const chosenMethod = methods[(prevSem + s.name.length) % methods.length];
        const pastTxn = await Transaction.create({
          idempotencyKey: `past-paid-${s.roll}-sem${prevSem}`,
          amount: pastTotalPaise,
          currency: 'INR',
          method: chosenMethod,
          status: 'captured',
          student: user._id,
          demand: pastDemand._id,
          capturedAt: pastPayDate,
          razorpayPaymentId: chosenMethod !== 'offline_dd' ? `pay_past_${s.roll}_s${prevSem}` : undefined,
          offlineDetails: chosenMethod === 'offline_dd' ? {
            ddNumber: `DD-SBI-${prevSem}09${s.roll.slice(-3)}`,
            bankName: 'State Bank of India',
            bankBranch: 'Main University Branch',
            instrumentDate: pastPayDate,
            approvedBy: adminUser._id,
            approvedAt: pastPayDate,
            remarks: 'Past semester clearance DD verified',
          } : undefined,
        });

        const recNum = `REC-${s.roll}-S${prevSem}`;
        const pastHash = crypto.createHash('sha256').update(`${recNum}-${user._id}-${pastTotalPaise}`).digest('hex');
        await Receipt.create({
          receiptNumber: recNum,
          transaction: pastTxn._id,
          student: user._id,
          demand: pastDemand._id,
          amountPaid: pastTotalPaise,
          components: pastDemand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
          paymentMethod: pastTxn.method,
          paymentReference: pastTxn.razorpayPaymentId || pastTxn.offlineDetails?.ddNumber || 'BANK-REF-PAST',
          academicYear: pastAcadYear,
          semester: prevSem,
          sha256Hash: pastHash,
          issuedAt: pastPayDate,
        });

        await postDoubleEntry({
          debitAccount: 'Student Fee Receivable',
          creditAccount: 'Tuition Fee Revenue',
          amount: pastTotalPaise,
          narration: `Semester ${prevSem} Assessment for ${s.name}`,
          studentId: user._id,
          demandId: pastDemand._id,
        });

        await postDoubleEntry({
          debitAccount: 'Bank Operating Account',
          creditAccount: 'Student Fee Receivable',
          amount: pastTotalPaise,
          narration: `Semester ${prevSem} Settlement Receipt ${recNum}`,
          studentId: user._id,
          demandId: pastDemand._id,
          transactionId: pastTxn._id,
        });
      }
    }
  }
  console.log('✅ Created 12 Students + Full Past & Present Fee Demands, Receipts & Ledger Entries.');

  // 6. SEED TIMETABLES & ATTENDANCE
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

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const deptCode of Object.keys(depts)) {
    const deptDoc = depts[deptCode];
    const subjects = DEPT_SUBJECTS[deptCode];

    for (const sem of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const weeklySchedule = DAYS.map((day, dIdx) => ({
        day,
        slots: [
          { slotNumber: 1, startTime: '08:00 AM', endTime: '09:00 AM', subjectCode: subjects[dIdx % 4].code, subjectName: subjects[dIdx % 4].name, facultyName: subjects[dIdx % 4].faculty, room: `${deptCode}-LH-101`, type: 'lecture' },
          { slotNumber: 2, startTime: '09:00 AM', endTime: '10:00 AM', subjectCode: subjects[(dIdx + 1) % 4].code, subjectName: subjects[(dIdx + 1) % 4].name, facultyName: subjects[(dIdx + 1) % 4].faculty, room: `${deptCode}-LH-102`, type: 'lecture' },
          { slotNumber: 3, startTime: '10:00 AM', endTime: '11:15 AM', subjectCode: subjects[(dIdx + 2) % 4].code, subjectName: subjects[(dIdx + 2) % 4].name, facultyName: subjects[(dIdx + 2) % 4].faculty, room: `${deptCode}-LH-103`, type: 'lecture' },
          { slotNumber: 4, startTime: '12:00 PM', endTime: '01:00 PM', subjectCode: subjects[(dIdx + 3) % 4].code, subjectName: subjects[(dIdx + 3) % 4].name, facultyName: subjects[(dIdx + 3) % 4].faculty, room: `${deptCode}-LH-104`, type: 'lecture' },
          { slotNumber: 5, startTime: '01:00 PM', endTime: '02:00 PM', subjectCode: subjects[dIdx % 2 === 0 ? 0 : 1].code, subjectName: subjects[dIdx % 2 === 0 ? 0 : 1].name, facultyName: subjects[dIdx % 2 === 0 ? 0 : 1].faculty, room: `${deptCode}-LH-201`, type: 'tutorial' },
          { slotNumber: 6, startTime: '02:00 PM', endTime: '03:00 PM', subjectCode: subjects[4].code, subjectName: subjects[4].name, facultyName: subjects[4].faculty, room: `${deptCode}-Lab 1`, type: 'lab' },
        ]
      }));

      await Timetable.create({
        department: deptDoc._id,
        semester: sem,
        academicYear: '2025-26',
        collegeHours: '08:00 AM - 03:00 PM',
        lunchBreak: '11:15 AM - 12:00 PM',
        weeklySchedule,
      });
    }
  }
  console.log('✅ Timetables created across all departments & semesters 1-8.');

  // Create Attendance for all 12 students
  const allStudents = await User.find({ role: 'student' });
  const ATT_PROFILES = [
    [{ total: 42, attended: 39 }, { total: 40, attended: 36 }, { total: 38, attended: 34 }, { total: 44, attended: 38 }, { total: 20, attended: 19 }],
    [{ total: 42, attended: 35 }, { total: 40, attended: 32 }, { total: 40, attended: 27 }, { total: 44, attended: 36 }, { total: 20, attended: 18 }],
    [{ total: 42, attended: 28 }, { total: 40, attended: 26 }, { total: 38, attended: 31 }, { total: 44, attended: 29 }, { total: 20, attended: 14 }],
  ];

  for (let idx = 0; idx < allStudents.length; idx++) {
    const s = allStudents[idx];
    const deptDoc = await Department.findById(s.department);
    const deptCode = deptDoc?.code || 'CSE';
    const subjectsList = DEPT_SUBJECTS[deptCode];
    const prof = ATT_PROFILES[idx % 3];

    const studentSubjects = subjectsList.map((sub, sIdx) => {
      const st = prof[sIdx];
      return {
        subjectCode: sub.code,
        subjectName: sub.name,
        facultyName: sub.faculty,
        credits: sub.credits,
        totalClasses: st.total,
        attendedClasses: st.attended,
      };
    });

    await Attendance.create({
      student: s._id,
      semester: s.currentSemester || 1,
      academicYear: '2025-26',
      subjects: studentSubjects,
    });
  }
  console.log('✅ Attendance seeded for all 12 students.');

  // 7. SEED SCHOLARSHIPS & WAIVERS & OFFLINE PAYMENTS (APPROVED, PENDING, REJECTED)
  console.log('⚡ Seeding Scholarships & Offline Payments (Approved, Pending, Rejected)...');

  // Ritika Sen (ECE2402) - ₹25,000 Merit Scholarship
  const ritika = studentDocs['ECE2402'];
  if (ritika) {
    const d = await FeeDemand.findOne({ student: ritika._id, semester: ritika.currentSemester });
    if (d) {
      const scholPaise = paise(25000);
      d.scholarshipAmount = scholPaise;
      d.scholarshipReason = 'Merit-Based Institutional Scholarship — Top 5% CGPA';
      d.scholarshipAppliedBy = superUser._id;
      d.outstandingAmount = Math.max(0, d.totalDemanded - d.totalPaid - d.totalWaived - scholPaise);
      await d.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholPaise,
        narration: `Merit scholarship granted to ${ritika.name} (${ritika.rollNumber})`,
        studentId: ritika._id,
        demandId: d._id,
        postedBy: superUser._id,
        postedByLabel: superUser.name,
      });
    }
  }

  // Alia Bhatt (CE2402) - ₹20,000 Women in STEM Bursary
  const alia = studentDocs['CE2402'];
  if (alia) {
    const d = await FeeDemand.findOne({ student: alia._id, semester: alia.currentSemester });
    if (d) {
      const scholPaise = paise(20000);
      d.scholarshipAmount = scholPaise;
      d.scholarshipReason = 'Women in STEM Engineering Bursary Grant';
      d.scholarshipAppliedBy = superUser._id;
      d.outstandingAmount = Math.max(0, d.totalDemanded - d.totalPaid - d.totalWaived - scholPaise);
      await d.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholPaise,
        narration: `STEM Bursary granted to ${alia.name} (${alia.rollNumber})`,
        studentId: alia._id,
        demandId: d._id,
        postedBy: superUser._id,
        postedByLabel: superUser.name,
      });
    }
  }

  // Pooja Bhatia (ME2302) - ₹15,000 Financial Need Bursary
  const pooja = studentDocs['ME2302'];
  if (pooja) {
    const d = await FeeDemand.findOne({ student: pooja._id, semester: pooja.currentSemester });
    if (d) {
      const scholPaise = paise(15000);
      d.scholarshipAmount = scholPaise;
      d.scholarshipReason = 'Dean Discretionary Financial Need Concession';
      d.scholarshipAppliedBy = superUser._id;
      d.outstandingAmount = Math.max(0, d.totalDemanded - d.totalPaid - d.totalWaived - scholPaise);
      await d.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholPaise,
        narration: `Need bursary granted to ${pooja.name} (${pooja.rollNumber})`,
        studentId: pooja._id,
        demandId: d._id,
        postedBy: superUser._id,
        postedByLabel: superUser.name,
      });
    }
  }

  // OFFLINE PAYMENTS: APPROVED, PENDING, AND REJECTED
  // A. Approved DD for Varun Dhawan (ECE2401)
  const varun = studentDocs['ECE2401'];
  if (varun) {
    const d = await FeeDemand.findOne({ student: varun._id, semester: varun.currentSemester });
    if (d) {
      const txn = await Transaction.create({
        idempotencyKey: `offline-dd-approved-${varun._id}`,
        amount: paise(60000),
        currency: 'INR',
        method: 'offline_dd',
        status: 'captured',
        student: varun._id,
        demand: d._id,
        offlineDetails: {
          ddNumber: 'DD-HDFC-992104',
          bankName: 'HDFC Bank Ltd',
          bankBranch: 'Connaught Place Main Branch',
          instrumentDate: daysAgo(10),
          approvedBy: adminUser._id,
          approvedAt: daysAgo(9),
          remarks: 'Demand Draft cleared and verified by treasury desk',
        },
        capturedAt: daysAgo(9),
      });

      const hash = crypto.createHash('sha256').update(`${txn._id}-${varun._id}-6000000`).digest('hex');
      await Receipt.create({
        receiptNumber: 'REC-OFFLINE-001',
        transaction: txn._id,
        student: varun._id,
        demand: d._id,
        amountPaid: paise(60000),
        components: d.components.map(c => ({ name: c.name, amount: Math.min(c.demandedAmount, paise(60000)) })),
        paymentMethod: 'offline_dd',
        paymentReference: 'DD-HDFC-992104',
        academicYear: d.academicYear,
        semester: d.semester,
        sha256Hash: hash,
        issuedAt: daysAgo(9),
      });
    }
  }

  // B. Pending Approval DD for Aarav Gupta (CSE2502)
  const aarav = studentDocs['CSE2502'];
  if (aarav) {
    const d = await FeeDemand.findOne({ student: aarav._id, semester: aarav.currentSemester });
    if (d) {
      await Transaction.create({
        idempotencyKey: `offline-dd-pending-${aarav._id}`,
        amount: paise(35000),
        currency: 'INR',
        method: 'offline_dd',
        status: 'pending_approval',
        student: aarav._id,
        demand: d._id,
        offlineDetails: {
          ddNumber: 'DD-ICICI-441920',
          bankName: 'ICICI Bank',
          bankBranch: 'Cyber City Branch, Gurugram',
          instrumentDate: daysAgo(2),
          remarks: 'Semester tuition fee partial installment via Bank Demand Draft',
        },
      });
    }
  }

  // C. Rejected Challan for Rohit Gupta (CSE2303)
  const rohit = studentDocs['CSE2303'];
  if (rohit) {
    const d = await FeeDemand.findOne({ student: rohit._id, semester: rohit.currentSemester });
    if (d) {
      await Transaction.create({
        idempotencyKey: `offline-chl-rejected-${rohit._id}`,
        amount: paise(25000),
        currency: 'INR',
        method: 'offline_challan',
        status: 'failed',
        student: rohit._id,
        demand: d._id,
        offlineDetails: {
          challanNo: 'CHL-PNB-001928',
          bankName: 'Punjab National Bank',
          bankBranch: 'GT Road Branch',
          instrumentDate: daysAgo(5),
          rejectedBy: adminUser._id,
          rejectedAt: daysAgo(4),
          remarks: 'REJECTED: Bank seal missing and instrument signature mismatch on counterfoil',
        },
      });
    }
  }
  console.log('✅ Offline payments seeded: Approved (Varun), Pending Approval (Aarav), Rejected (Rohit).');

  // 8. SEED CAUTION MONEY (PAID BACK / REFUNDED VS HELD)
  const refundedRolls = ['CSE2501', 'ECE2401', 'ME2301', 'CE2401'];
  for (const s of studentsList) {
    const userDoc = studentDocs[s.roll];
    const isRefunded = refundedRolls.includes(s.roll);
    const depositAmount = paise(10000);

    if (isRefunded) {
      await CautionMoney.create({
        student: userDoc._id,
        depositAmount,
        depositDate: new Date('2023-07-15'),
        status: 'refunded',
        refundAmount: depositAmount,
        refundDate: daysAgo(15),
        refundApprovedBy: adminUser._id,
        refundTransactionRef: 'NEFT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        refundMode: 'bank_transfer',
        notes: 'Graduation / Institutional No-Dues Clearance successfully settled & caution deposit refunded',
      });
    } else {
      await CautionMoney.create({
        student: userDoc._id,
        depositAmount,
        depositDate: new Date('2024-07-20'),
        status: 'held',
        refundAmount: 0,
        notes: 'Institutional security deposit held in college treasury escrow',
      });
    }
  }
  console.log('✅ Caution Money seeded: 4 REFUNDED (Paid back), 8 HELD.');

  // 9. SEED INSTALLMENT PLANS FOR PENDING STUDENTS
  if (aarav) {
    const d = await FeeDemand.findOne({ student: aarav._id, semester: aarav.currentSemester });
    if (d) {
      const total = d.outstandingAmount || d.totalDemanded;
      const slotAmt = Math.floor(total / 3);
      const plan = await InstallmentPlan.create({
        name: '3-Part Semester Split Plan',
        demand: d._id,
        student: aarav._id,
        installments: [
          { slotNumber: 1, dueDate: daysFrom(15), amount: slotAmt, status: 'pending' },
          { slotNumber: 2, dueDate: daysFrom(45), amount: slotAmt, status: 'pending' },
          { slotNumber: 3, dueDate: daysFrom(75), amount: total - (slotAmt * 2), status: 'pending' },
        ],
        totalAmount: total,
        createdBy: adminUser._id,
        status: 'active',
      });
      d.installmentPlan = plan._id;
      await d.save();
    }
  }
  console.log('✅ Installment plan seeded for Aarav Gupta.');

  console.log('\n🎉 ALL MASTER DATA SEEDED SUCCESSFULLY WITH 100% COMPLETE RECORDS!');
  await mongoose.disconnect();
  process.exit(0);
}

runMasterSeed().catch(err => {
  console.error('❌ Master seed failed:', err);
  process.exit(1);
});
