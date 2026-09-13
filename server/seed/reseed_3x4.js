import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import User from '../models/User.js';
import Department from '../models/Department.js';
import FeeStructure from '../models/FeeStructure.js';
import FeeDemand from '../models/FeeDemand.js';
import Transaction from '../models/Transaction.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Receipt from '../models/Receipt.js';
import CautionMoney from '../models/CautionMoney.js';
import LateFeeRule from '../models/LateFeeRule.js';
import AuditLog from '../models/AuditLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx';
const DEMO_PASSWORD = 'demo123';
const RECEIPT_SALT = process.env.RECEIPT_HASH_SALT || 'ledgerx_sha256_salt';

const paise = (r) => Math.round(r * 100);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFrom = (n) => new Date(Date.now() + n * 86400000);

let receiptSeq = 5000;
const nextReceiptNo = () => `RX${new Date().getFullYear()}${String(++receiptSeq).padStart(6, '0')}`;
const sha256 = (data) => crypto.createHash('sha256').update(data + RECEIPT_SALT).digest('hex');

async function postJournal({ debitAccount, creditAccount, amount, narration, student, demand, txn }) {
  const journalId = uuidv4();
  await LedgerEntry.insertMany([
    { journalId, type: 'debit', account: debitAccount, amount, narration, relatedStudent: student, relatedDemand: demand, relatedTransaction: txn, postedByLabel: 'SYSTEM' },
    { journalId, type: 'credit', account: creditAccount, amount, narration, relatedStudent: student, relatedDemand: demand, relatedTransaction: txn, postedByLabel: 'SYSTEM' },
  ]);
}

async function createPaymentRecord({ studentId, demandDoc, amount, method = 'upi' }) {
  const txn = await Transaction.create({
    idempotencyKey: uuidv4(),
    razorpayOrderId: `order_${uuidv4().slice(0, 14)}`,
    razorpayPaymentId: `pay_${uuidv4().slice(0, 14)}`,
    amount,
    currency: 'INR',
    method,
    status: 'captured',
    student: studentId,
    demand: demandDoc._id,
    webhookVerified: true,
    capturedAt: new Date(),
  });

  await postJournal({
    debitAccount: 'Bank / Cash',
    creditAccount: 'Student Fee Receivable',
    amount,
    narration: `Fee settlement — Sem ${demandDoc.semester}`,
    student: studentId,
    demand: demandDoc._id,
    txn: txn._id,
  });

  const receiptNumber = nextReceiptNo();
  await Receipt.create({
    receiptNumber,
    transaction: txn._id,
    student: studentId,
    demand: demandDoc._id,
    amountPaid: amount,
    components: demandDoc.components.map(c => ({ name: c.name, amount: c.paidAmount })),
    paymentMethod: method,
    paymentReference: txn.razorpayPaymentId,
    academicYear: demandDoc.academicYear,
    semester: demandDoc.semester,
    sha256Hash: sha256(`${receiptNumber}:${amount}:${studentId}`),
    verificationUrl: `/api/receipts/${receiptNumber}/verify`,
    issuedAt: new Date(),
  });
}

async function runReseed() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log('Deleting all students, demands, transactions, receipts, and ledger entries...');
  await FeeDemand.deleteMany({});
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
  await Receipt.deleteMany({});
  await CautionMoney.deleteMany({});
  await AuditLog.deleteMany({});
  await User.deleteMany({ role: 'student' });

  // Ensure Admin & Superuser exist with demo123
  const staffHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: 'admin@demo.com' },
    { name: 'Dr. Ramesh Finance', email: 'admin@demo.com', passwordHash: staffHash, role: 'admin', isActive: true },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: 'super@demo.com' },
    { name: 'Dr. Priya Registrar', email: 'super@demo.com', passwordHash: staffHash, role: 'superuser', isActive: true },
    { upsert: true }
  );

  // 4 Departments
  const deptData = [
    { code: 'CSE', name: 'Computer Science & Engineering' },
    { code: 'ECE', name: 'Electronics & Communication Engineering' },
    { code: 'ME',  name: 'Mechanical Engineering' },
    { code: 'CE',  name: 'Civil Engineering' },
  ];
  const depts = {};
  for (const d of deptData) {
    let doc = await Department.findOne({ code: d.code });
    if (!doc) doc = await Department.create(d);
    depts[d.code] = doc;
  }

  // Late fee rule
  const lateRule = await LateFeeRule.findOneAndUpdate(
    { ruleType: 'dailyPercentage' },
    { ruleType: 'dailyPercentage', dailyRate: 0.1, maxCap: paise(10000), effectiveAfterDays: 0, description: 'Standard 0.1% daily penalty' },
    { upsert: true, new: true }
  );

  // Specific 3 students per department definitions:
  // [Dept, Name, Email, Roll, Semester, Batch, AcadYear, Status, TotalFees]
  const studentsList = [
    // CSE (3 students)
    { dept: 'CSE', name: 'Rahul Sharma', email: 'student@demo.com', roll: 'CSE2501', sem: 1, year: 1, batch: '2025-2029', acadYear: '2025-26', status: 'Paid', totalFees: 110000 },
    { dept: 'CSE', name: 'Aarav Gupta', email: 'cse.pending@demo.com', roll: 'CSE2502', sem: 1, year: 1, batch: '2025-2029', acadYear: '2025-26', status: 'Pending', totalFees: 110000 },
    { dept: 'CSE', name: 'Rohit Gupta', email: 'rohit@demo.com', roll: 'CSE2303', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Defaulter', totalFees: 95000 },

    // ECE (3 students)
    { dept: 'ECE', name: 'Varun Dhawan', email: 'ece.paid@demo.com', roll: 'ECE2401', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Paid', totalFees: 102000 },
    { dept: 'ECE', name: 'Ritika Sen', email: 'ece.pending@demo.com', roll: 'ECE2402', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Pending', totalFees: 102000 },
    { dept: 'ECE', name: 'Karan Joshi', email: 'karan@demo.com', roll: 'ECE2403', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Defaulter', totalFees: 102000 },

    // ME (3 students)
    { dept: 'ME', name: 'Sameer Khan', email: 'me.paid@demo.com', roll: 'ME2301', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Paid', totalFees: 95000 },
    { dept: 'ME', name: 'Pooja Bhatia', email: 'me.pending@demo.com', roll: 'ME2302', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Pending', totalFees: 95000 },
    { dept: 'ME', name: 'Sanjay Iyer', email: 'sanjay@demo.com', roll: 'ME2303', sem: 5, year: 3, batch: '2023-2027', acadYear: '2023-24', status: 'Defaulter', totalFees: 95000 },

    // CE (3 students)
    { dept: 'CE', name: 'Rajesh Koothrappali', email: 'ce.paid@demo.com', roll: 'CE2401', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Paid', totalFees: 102000 },
    { dept: 'CE', name: 'Alia Bhatt', email: 'ce.pending@demo.com', roll: 'CE2402', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Pending', totalFees: 102000 },
    { dept: 'CE', name: 'Geeta Bhat', email: 'geeta@demo.com', roll: 'CE2403', sem: 3, year: 2, batch: '2024-2028', acadYear: '2024-25', status: 'Defaulter', totalFees: 102000 },
  ];

  const studentsExport = [];

  for (const s of studentsList) {
    const deptDoc = depts[s.dept];

    // Ensure Fee Structure exists
    let fs = await FeeStructure.findOne({ department: deptDoc._id, semester: s.sem, batch: s.batch });
    if (!fs) {
      fs = await FeeStructure.create({
        department: deptDoc._id,
        batch: s.batch,
        semester: s.sem,
        academicYear: s.acadYear,
        dueDate: daysFrom(30),
        totalAmount: paise(s.totalFees),
        components: [
          { name: 'Tuition', amount: paise(s.totalFees * 0.75) },
          { name: 'Development', amount: paise(s.totalFees * 0.10) },
          { name: 'Lab', amount: paise(s.totalFees * 0.08) },
          { name: 'Exam', amount: paise(s.totalFees * 0.04) },
          { name: 'Library', amount: paise(s.totalFees * 0.03) },
        ],
        isPublished: true,
        isActive: true,
      });
    }

    // Create User (pre-save hook hashes DEMO_PASSWORD)
    const user = await User.create({
      name: s.name,
      email: s.email,
      passwordHash: DEMO_PASSWORD,
      role: 'student',
      rollNumber: s.roll,
      department: deptDoc._id,
      batch: s.batch,
      currentSemester: s.sem,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      isActive: true,
    });

    const totalPaise = fs.totalAmount;
    let dueDate = daysFrom(20);
    let totalPaid = 0;
    let outstanding = totalPaise;
    let lateFeeAccrued = 0;
    let demandStatus = 'pending';

    const components = fs.components.map(c => ({
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
      lateFeeAccrued = paise(1500); // ₹1,500 accrued late fee
    }

    const demand = await FeeDemand.create({
      student: user._id,
      feeStructure: fs._id,
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

    // Double-entry record for demand raise
    await postJournal({
      debitAccount: 'Student Fee Receivable',
      creditAccount: 'Fee Income',
      amount: totalPaise,
      narration: `Fee Demand Raised — Sem ${s.sem}`,
      student: user._id,
      demand: demand._id,
    });

    // If paid, create payment record
    if (totalPaid > 0) {
      await createPaymentRecord({
        studentId: user._id,
        demandDoc: demand,
        amount: totalPaid,
        method: 'upi',
      });
    }

    studentsExport.push({
      department: s.dept,
      departmentName: deptDoc.name,
      year: s.year,
      semester: s.sem,
      batch: s.batch,
      academicYear: s.acadYear,
      rollNumber: s.roll,
      name: s.name,
      email: s.email,
      password: DEMO_PASSWORD,
      status: s.status,
      totalDemanded: (totalPaise / 100),
      totalPaid: (totalPaid / 100),
      outstandingBalance: (outstanding / 100),
      lateFeeAccrued: (lateFeeAccrued / 100),
      scholarshipConcession: 0,
      notes: s.status === 'Defaulter' ? 'Defaulter clearance gateway (45 days overdue, ₹1500 penalty)' : s.status === 'Paid' ? 'All Clear — Zero Dues Verified' : 'Standard Pending — Ready for Payment',
    });
  }

  // Write JSON export
  const exportPath = path.resolve('../students_manual_test_roster.json');
  fs.writeFileSync(exportPath, JSON.stringify(studentsExport, null, 2), 'utf-8');
  console.log(`Successfully created ${studentsExport.length} students (3 per department)! JSON written to ${exportPath}`);

  await mongoose.disconnect();
}

runReseed().catch(err => {
  console.error('Reseed failed:', err);
  process.exit(1);
});
