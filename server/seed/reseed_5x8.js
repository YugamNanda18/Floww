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

let receiptSeq = 3000;
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

const firstNames = [
  'Aarav', 'Aditya', 'Akhil', 'Alia', 'Ananya', 'Anjali', 'Arjun', 'Chetan', 'Deepa', 'Devansh',
  'Divya', 'Gaurav', 'Geeta', 'Harish', 'Harsh', 'Hema', 'Ishaan', 'Karan', 'Kavya', 'Kriti',
  'Kunal', 'Manish', 'Manoj', 'Meera', 'Neha', 'Nikhil', 'Nisha', 'Pooja', 'Pranav', 'Preeti',
  'Priya', 'Rahul', 'Rajesh', 'Ramesh', 'Rashi', 'Ravi', 'Rekha', 'Ritika', 'Rohan', 'Rohit',
  'Sachin', 'Sameer', 'Sanjay', 'Shalini', 'Shruti', 'Siddharth', 'Simran', 'Sneha', 'Sumit', 'Sunita',
  'Suraj', 'Swati', 'Tanvi', 'Tarun', 'Usha', 'Varun', 'Vikram', 'Vinod', 'Vivek', 'Yash'
];

const lastNames = [
  'Sharma', 'Gupta', 'Verma', 'Mehta', 'Patel', 'Joshi', 'Singh', 'Kumar', 'Iyer', 'Nair',
  'Menon', 'Reddy', 'Bhat', 'Bose', 'Kapoor', 'Khanna', 'Deshmukh', 'Chauhan', 'Saxena', 'Bhatt'
];

function getRandomName(seedIndex) {
  const f = firstNames[seedIndex % firstNames.length];
  const l = lastNames[(seedIndex * 7) % lastNames.length];
  return `${f} ${l}`;
}

async function runReseed() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log('Deleting all student records and related transactions...');
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

  // Departments
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

  // 8 Semesters fee structure base definitions
  const semesterDefs = [
    { sem: 1, year: 1, batch: '2025-2029', academicYear: '2025-26', total: 110000 },
    { sem: 2, year: 1, batch: '2025-2029', academicYear: '2025-26', total: 105000 },
    { sem: 3, year: 2, batch: '2024-2028', academicYear: '2024-25', total: 102000 },
    { sem: 4, year: 2, batch: '2024-2028', academicYear: '2024-25', total: 98000 },
    { sem: 5, year: 3, batch: '2023-2027', academicYear: '2023-24', total: 95000 },
    { sem: 6, year: 3, batch: '2023-2027', academicYear: '2023-24', total: 92000 },
    { sem: 7, year: 4, batch: '2022-2026', academicYear: '2022-23', total: 90000 },
    { sem: 8, year: 4, batch: '2022-2026', academicYear: '2022-23', total: 88000 },
  ];

  const feeStructures = {};
  for (const [code, deptDoc] of Object.entries(depts)) {
    for (const sDef of semesterDefs) {
      const fsKey = `${code}_${sDef.sem}`;
      let fs = await FeeStructure.findOne({ department: deptDoc._id, semester: sDef.sem, batch: sDef.batch });
      if (!fs) {
        fs = await FeeStructure.create({
          department: deptDoc._id,
          batch: sDef.batch,
          semester: sDef.sem,
          academicYear: sDef.academicYear,
          dueDate: daysFrom(30),
          totalAmount: paise(sDef.total),
          components: [
            { name: 'Tuition', amount: paise(sDef.total * 0.75) },
            { name: 'Development', amount: paise(sDef.total * 0.10) },
            { name: 'Lab', amount: paise(sDef.total * 0.08) },
            { name: 'Exam', amount: paise(sDef.total * 0.04) },
            { name: 'Library', amount: paise(sDef.total * 0.03) },
          ],
          isPublished: true,
          isActive: true,
        });
      }
      feeStructures[fsKey] = fs;
    }
  }

  const studentsExport = [];
  let nameIndex = 0;

  // Canonical account overrides for easy testing
  const canonicalOverrides = {
    'CSE_1_1': { name: 'Rahul Sharma', email: 'student@demo.com' },
    'CSE_5_3': { name: 'Rohit Gupta', email: 'rohit@demo.com' },
    'ECE_3_3': { name: 'Karan Joshi', email: 'karan@demo.com' },
    'ME_5_3':  { name: 'Sanjay Iyer', email: 'sanjay@demo.com' },
    'CE_3_3':  { name: 'Geeta Bhat', email: 'geeta@demo.com' },
    'CE_7_3':  { name: 'Aditya Singh', email: 'aditya@demo.com' },
  };

  const statusTypes = [
    { type: 'Paid', status: 'paid' },
    { type: 'Pending', status: 'pending' },
    { type: 'Defaulter', status: 'overdue' },
    { type: 'Scholarship', status: 'partial' },
    { type: 'Partial', status: 'partial' },
  ];

  for (const [deptCode, deptDoc] of Object.entries(depts)) {
    for (const sDef of semesterDefs) {
      const fs = feeStructures[`${deptCode}_${sDef.sem}`];

      for (let sIdx = 1; sIdx <= 5; sIdx++) {
        nameIndex++;
        const sTypeObj = statusTypes[sIdx - 1];
        const sType = sTypeObj.type;
        const demandStatus = sTypeObj.status;

        const overrideKey = `${deptCode}_${sDef.sem}_${sIdx}`;
        let sName = canonicalOverrides[overrideKey]?.name || getRandomName(nameIndex);
        let sEmail = canonicalOverrides[overrideKey]?.email || `${deptCode.toLowerCase()}.sem${sDef.sem}.s${sIdx}@demo.com`;
        let sRoll = `${deptCode}${sDef.batch.slice(2, 4)}${String(sDef.sem).padStart(2, '0')}${String(sIdx).padStart(2, '0')}`;

        // Create user (pre-save hook hashes DEMO_PASSWORD)
        const user = await User.create({
          name: sName,
          email: sEmail,
          passwordHash: DEMO_PASSWORD,
          role: 'student',
          rollNumber: sRoll,
          department: deptDoc._id,
          batch: sDef.batch,
          currentSemester: sDef.sem,
          phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
          isActive: true,
        });

        // Set up demand
        const totalPaise = fs.totalAmount;
        let dueDate = daysFrom(25);
        let totalPaid = 0;
        let outstanding = totalPaise;
        let lateFeeAccrued = 0;
        let scholarshipAmount = 0;
        let scholarshipReason = '';

        const components = fs.components.map(c => ({
          name: c.name,
          demandedAmount: c.amount,
          paidAmount: 0,
          waivedAmount: 0,
          status: 'pending',
        }));

        if (sType === 'Paid') {
          dueDate = daysAgo(15);
          totalPaid = totalPaise;
          outstanding = 0;
          components.forEach(c => {
            c.paidAmount = c.demandedAmount;
            c.status = 'paid';
          });
        } else if (sType === 'Pending') {
          dueDate = daysFrom(20);
          totalPaid = 0;
          outstanding = totalPaise;
        } else if (sType === 'Defaulter') {
          dueDate = daysAgo(45);
          totalPaid = 0;
          outstanding = totalPaise;
          lateFeeAccrued = paise(1500); // ₹1,500 late fee
        } else if (sType === 'Scholarship') {
          dueDate = daysFrom(30);
          scholarshipAmount = paise(25000); // ₹25,000 concession
          scholarshipReason = 'Institutional Academic Bursary';
          totalPaid = paise(20000); // Partial paid
          outstanding = Math.max(0, totalPaise - scholarshipAmount - totalPaid);
          components[0].paidAmount = totalPaid;
          components[0].status = 'partial';
        } else if (sType === 'Partial') {
          dueDate = daysFrom(30);
          totalPaid = paise(35000); // ₹35,000 paid
          outstanding = Math.max(0, totalPaise - totalPaid);
          components[0].paidAmount = totalPaid;
          components[0].status = 'partial';
        }

        const demand = await FeeDemand.create({
          student: user._id,
          feeStructure: fs._id,
          semester: sDef.sem,
          academicYear: sDef.academicYear,
          dueDate,
          components,
          totalDemanded: totalPaise,
          totalPaid,
          totalWaived: 0,
          outstandingAmount: outstanding,
          lateFeeAccrued,
          lateFeeRule: lateRule._id,
          scholarshipAmount,
          scholarshipReason,
          status: demandStatus,
        });

        // Double-entry record for demand raise
        await postJournal({
          debitAccount: 'Student Fee Receivable',
          creditAccount: 'Fee Income',
          amount: totalPaise,
          narration: `Fee Demand Raised — Sem ${sDef.sem}`,
          student: user._id,
          demand: demand._id,
        });

        // Settle payment if paid or partial
        if (totalPaid > 0) {
          await createPaymentRecord({
            studentId: user._id,
            demandDoc: demand,
            amount: totalPaid,
            method: 'upi',
          });
        }

        studentsExport.push({
          department: deptCode,
          departmentName: deptDoc.name,
          year: sDef.year,
          semester: sDef.sem,
          batch: sDef.batch,
          academicYear: sDef.academicYear,
          rollNumber: sRoll,
          name: sName,
          email: sEmail,
          password: DEMO_PASSWORD,
          status: sType,
          totalDemanded: (totalPaise / 100),
          totalPaid: (totalPaid / 100),
          outstandingBalance: (outstanding / 100),
          lateFeeAccrued: (lateFeeAccrued / 100),
          scholarshipConcession: (scholarshipAmount / 100),
          notes: sType === 'Defaulter' ? 'Defaulter portal with accrued late fee' : sType === 'Paid' ? 'Zero dues, verified paid' : sType === 'Scholarship' ? 'Institutional scholarship granted' : sType === 'Partial' ? 'Active flexi-pay, good standing' : 'Ready to pay',
        });
      }
    }
  }

  // Write JSON export
  const exportPath = path.resolve('../students_manual_test_roster.json');
  fs.writeFileSync(exportPath, JSON.stringify(studentsExport, null, 2), 'utf-8');
  console.log(`Successfully created ${studentsExport.length} students! JSON written to ${exportPath}`);

  await mongoose.disconnect();
}

runReseed().catch(err => {
  console.error('Reseed failed:', err);
  process.exit(1);
});
