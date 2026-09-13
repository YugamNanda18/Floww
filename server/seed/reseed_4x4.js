import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

let receiptSeq = 2000;
const nextReceiptNo = () => `RX${new Date().getFullYear()}${String(++receiptSeq).padStart(6, '0')}`;
const sha256 = (data) => crypto.createHash('sha256').update(data + RECEIPT_SALT).digest('hex');

async function postJournal({ debitAccount, creditAccount, amount, narration, student, demand, txn }) {
  const journalId = uuidv4();
  await LedgerEntry.insertMany([
    { journalId, type: 'debit', account: debitAccount, amount, narration, relatedStudent: student, relatedDemand: demand, relatedTransaction: txn, postedByLabel: 'SYSTEM' },
    { journalId, type: 'credit', account: creditAccount, amount, narration, relatedStudent: student, relatedDemand: demand, relatedTransaction: txn, postedByLabel: 'SYSTEM' },
  ]);
}

async function createPayment({ studentId, demandDoc, amount, method = 'upi' }) {
  const txn = await Transaction.create({
    idempotencyKey: uuidv4(),
    razorpayOrderId: `order_${uuidv4().slice(0, 14)}`,
    razorpayPaymentId: `pay_${uuidv4().slice(0, 14)}`,
    amount,
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

async function seed() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log('Clearing old student and demand collections...');
  await FeeDemand.deleteMany({});
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
  await Receipt.deleteMany({});
  await CautionMoney.deleteMany({});
  await AuditLog.deleteMany({});
  await User.deleteMany({ role: 'student' });

  // Ensure Admin & Superuser exist
  const pwHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: 'admin@demo.com' },
    { name: 'Dr. Ramesh Finance', email: 'admin@demo.com', passwordHash: pwHash, role: 'admin', isActive: true },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: 'super@demo.com' },
    { name: 'Dr. Priya Registrar', email: 'super@demo.com', passwordHash: pwHash, role: 'superuser', isActive: true },
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

  // Late fee rules
  const lateRule = await LateFeeRule.findOneAndUpdate(
    { ruleType: 'dailyPercentage' },
    { ruleType: 'dailyPercentage', dailyRate: 0.1, maxCap: paise(10000), effectiveAfterDays: 0, description: 'Standard 0.1% daily penalty' },
    { upsert: true, new: true }
  );

  // Fee structures (1 per department per semester)
  const years = [
    { year: 1, semester: 1, batch: '2025-2029', academicYear: '2025-26', total: 110500 },
    { year: 2, semester: 3, batch: '2024-2028', academicYear: '2024-25', total: 105500 },
    { year: 3, semester: 5, batch: '2023-2027', academicYear: '2023-24', total: 98500 },
    { year: 4, semester: 7, batch: '2022-2026', academicYear: '2022-23', total: 92500 },
  ];

  const feeStructures = {};
  for (const [code, deptDoc] of Object.entries(depts)) {
    for (const yr of years) {
      const fsKey = `${code}_${yr.semester}`;
      let fs = await FeeStructure.findOne({ department: deptDoc._id, semester: yr.semester });
      if (!fs) {
        fs = await FeeStructure.create({
          department: deptDoc._id,
          batch: yr.batch,
          semester: yr.semester,
          academicYear: yr.academicYear,
          dueDate: daysFrom(30),
          totalAmount: paise(yr.total),
          components: [
            { name: 'Tuition', amount: paise(yr.total * 0.75) },
            { name: 'Development', amount: paise(yr.total * 0.10) },
            { name: 'Lab', amount: paise(yr.total * 0.08) },
            { name: 'Exam', amount: paise(yr.total * 0.04) },
            { name: 'Library', amount: paise(yr.total * 0.03) },
          ],
          isPublished: true,
          isActive: true,
        });
      }
      feeStructures[fsKey] = fs;
    }
  }

  // Student roster definitions (Exactly 4 per dept × year = 64 total)
  // [name, email, rollPrefix, statusType]
  const studentNames = {
    CSE: {
      1: [
        ['Rahul Sharma', 'student@demo.com', 'CSE2501', 'paid'],
        ['Aarav Gupta', 'cse.y1.s2@demo.com', 'CSE2502', 'pending'],
        ['Ishaan Verma', 'cse.y1.s3@demo.com', 'CSE2503', 'defaulter'],
        ['Ananya Sen', 'cse.y1.s4@demo.com', 'CSE2504', 'scholarship'],
      ],
      2: [
        ['Sneha Patel', 'cse.y2.s1@demo.com', 'CSE2401', 'paid'],
        ['Arjun Mehta', 'cse.y2.s2@demo.com', 'CSE2402', 'pending'],
        ['Rohan Joshi', 'cse.y2.s3@demo.com', 'CSE2403', 'defaulter'],
        ['Tanvi Deshmukh', 'cse.y2.s4@demo.com', 'CSE2404', 'scholarship'],
      ],
      3: [
        ['Devansh Kapoor', 'cse.y3.s1@demo.com', 'CSE2301', 'paid'],
        ['Pooja Hegde', 'cse.y3.s2@demo.com', 'cse2302@demo.com', 'pending'],
        ['Rohit Gupta', 'rohit@demo.com', 'CSE2303', 'defaulter'],
        ['Kavya Krishnan', 'cse.y3.s4@demo.com', 'CSE2304', 'scholarship'],
      ],
      4: [
        ['Aditya Singhania', 'cse.y4.s1@demo.com', 'CSE2201', 'paid'],
        ['Meera Nair', 'cse.y4.s2@demo.com', 'CSE2202', 'pending'],
        ['Vikramaditya Rao', 'cse.y4.s3@demo.com', 'CSE2203', 'defaulter'],
        ['Siddharth Bose', 'cse.y4.s4@demo.com', 'CSE2204', 'scholarship'],
      ],
    },
    ECE: {
      1: [
        ['Varun Dhawan', 'ece.y1.s1@demo.com', 'ECE2501', 'paid'],
        ['Ritika Sen', 'ece.y1.s2@demo.com', 'ECE2502', 'pending'],
        ['Nikhil Rajan', 'ece.y1.s3@demo.com', 'ECE2503', 'defaulter'],
        ['Simran Kaur', 'ece.y1.s4@demo.com', 'ECE2504', 'scholarship'],
      ],
      2: [
        ['Harsh Vardhan', 'ece.y2.s1@demo.com', 'ECE2401', 'paid'],
        ['Divya Nair', 'ece.y2.s2@demo.com', 'ECE2402', 'pending'],
        ['Karan Joshi', 'karan@demo.com', 'ECE2403', 'defaulter'],
        ['Shruti Jain', 'ece.y2.s4@demo.com', 'ECE2404', 'scholarship'],
      ],
      3: [
        ['Pranav Roy', 'ece.y3.s1@demo.com', 'ECE2301', 'paid'],
        ['Neha Kakkar', 'ece.y3.s2@demo.com', 'ECE2302', 'pending'],
        ['Harish Menon', 'ece.y3.s3@demo.com', 'ECE2303', 'defaulter'],
        ['Deepa Varma', 'ece.y3.s4@demo.com', 'ECE2304', 'scholarship'],
      ],
      4: [
        ['Gaurav Chopra', 'ece.y4.s1@demo.com', 'ECE2201', 'paid'],
        ['Anjali Mishra', 'ece.y4.s2@demo.com', 'ECE2202', 'pending'],
        ['Vikram Yadav', 'ece.y4.s3@demo.com', 'ECE2203', 'defaulter'],
        ['Priya Sharma', 'ece.y4.s4@demo.com', 'ECE2204', 'scholarship'],
      ],
    },
    ME: {
      1: [
        ['Sameer Khan', 'me.y1.s1@demo.com', 'ME2501', 'paid'],
        ['Pooja Bhatia', 'me.y1.s2@demo.com', 'ME2502', 'pending'],
        ['Tarun Malhotra', 'me.y1.s3@demo.com', 'ME2503', 'defaulter'],
        ['Swati Saxena', 'me.y1.s4@demo.com', 'ME2504', 'scholarship'],
      ],
      2: [
        ['Manish Pandey', 'me.y2.s1@demo.com', 'ME2401', 'paid'],
        ['Vivek Sharma', 'me.y2.s2@demo.com', 'ME2402', 'pending'],
        ['Nisha Pandey', 'me.y2.s3@demo.com', 'ME2403', 'defaulter'],
        ['Manoj Kumar', 'me.y2.s4@demo.com', 'ME2404', 'scholarship'],
      ],
      3: [
        ['Kunal Ghosh', 'me.y3.s1@demo.com', 'ME2301', 'paid'],
        ['Rashi Khanna', 'me.y3.s2@demo.com', 'ME2302', 'pending'],
        ['Sanjay Iyer', 'sanjay@demo.com', 'ME2303', 'defaulter'],
        ['Vinod Chauhan', 'me.y3.s4@demo.com', 'ME2304', 'scholarship'],
      ],
      4: [
        ['Akash Deep', 'me.y4.s1@demo.com', 'ME2201', 'paid'],
        ['Sunita Bose', 'me.y4.s2@demo.com', 'ME2202', 'pending'],
        ['Ravi Tiwari', 'me.y4.s3@demo.com', 'ME2203', 'defaulter'],
        ['Ramesh Nayak', 'me.y4.s4@demo.com', 'ME2204', 'scholarship'],
      ],
    },
    CE: {
      1: [
        ['Rajesh Koothrappali', 'ce.y1.s1@demo.com', 'CE2501', 'paid'],
        ['Alia Bhatt', 'ce.y1.s2@demo.com', 'CE2502', 'pending'],
        ['Suraj Pancholi', 'ce.y1.s3@demo.com', 'CE2503', 'defaulter'],
        ['Kriti Sanon', 'ce.y1.s4@demo.com', 'CE2504', 'scholarship'],
      ],
      2: [
        ['Sumit Yadav', 'ce.y2.s1@demo.com', 'CE2401', 'paid'],
        ['Hema Reddy', 'ce.y2.s2@demo.com', 'CE2402', 'pending'],
        ['Geeta Bhat', 'geeta@demo.com', 'CE2403', 'defaulter'],
        ['Ajay Dubey', 'ce.y2.s4@demo.com', 'CE2404', 'scholarship'],
      ],
      3: [
        ['Sachin Tendulkar', 'ce.y3.s1@demo.com', 'CE2301', 'paid'],
        ['Preeti Shah', 'ce.y3.s2@demo.com', 'CE2302', 'pending'],
        ['Rekha Patil', 'ce.y3.s3@demo.com', 'CE2303', 'defaulter'],
        ['Chetan Bansal', 'ce.y3.s4@demo.com', 'CE2304', 'scholarship'],
      ],
      4: [
        ['Usha Thomas', 'ce.y4.s1@demo.com', 'CE2201', 'paid'],
        ['Shalini Nair', 'ce.y4.s2@demo.com', 'CE2202', 'pending'],
        ['Aditya Singh', 'aditya@demo.com', 'CE2203', 'defaulter'],
        ['Neha Kapoor', 'ce.y4.s4@demo.com', 'CE2204', 'scholarship'],
      ],
    },
  };

  const createdStudents = [];

  for (const [deptCode, deptDoc] of Object.entries(depts)) {
    for (const yr of years) {
      const cohortList = studentNames[deptCode][yr.year];
      const fs = feeStructures[`${deptCode}_${yr.semester}`];

      for (const [sName, sEmail, sRoll, sType] of cohortList) {
        const user = await User.create({
          name: sName,
          email: sEmail,
          passwordHash: DEMO_PASSWORD,
          role: 'student',
          rollNumber: sRoll,
          department: deptDoc._id,
          batch: yr.batch,
          currentSemester: yr.semester,
          phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
          isActive: true,
        });

        // Set up Demand based on statusType
        const totalPaise = fs.totalAmount;
        let demandStatus = 'pending';
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

        if (sType === 'paid') {
          demandStatus = 'paid';
          dueDate = daysAgo(10);
          totalPaid = totalPaise;
          outstanding = 0;
          components.forEach(c => {
            c.paidAmount = c.demandedAmount;
            c.status = 'paid';
          });
        } else if (sType === 'pending') {
          demandStatus = 'pending';
          dueDate = daysFrom(20);
          totalPaid = 0;
          outstanding = totalPaise;
        } else if (sType === 'defaulter') {
          demandStatus = 'overdue';
          dueDate = daysAgo(45);
          totalPaid = 0;
          outstanding = totalPaise;
          lateFeeAccrued = paise(1500); // ₹1,500 accrued late fee
        } else if (sType === 'scholarship') {
          demandStatus = 'partial';
          dueDate = daysFrom(30);
          scholarshipAmount = paise(25000); // ₹25,000 scholarship concession
          scholarshipReason = 'Institutional Academic Bursary';
          totalPaid = paise(20000); // partial pay ₹20,000
          outstanding = Math.max(0, totalPaise - scholarshipAmount - totalPaid);
          components[0].paidAmount = totalPaid;
          components[0].status = 'partial';
        }

        const demand = await FeeDemand.create({
          student: user._id,
          feeStructure: fs._id,
          semester: yr.semester,
          academicYear: yr.academicYear,
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

        // Double-entry creation for demand raise
        await postJournal({
          debitAccount: 'Student Fee Receivable',
          creditAccount: 'Fee Income',
          amount: totalPaise,
          narration: `Fee Demand Raised — Sem ${yr.semester}`,
          student: user._id,
          demand: demand._id,
        });

        // If paid or partial, post payment receipt
        if (totalPaid > 0) {
          await createPayment({
            studentId: user._id,
            demandDoc: demand,
            amount: totalPaid,
            method: 'upi',
          });
        }

        createdStudents.push({
          dept: deptCode,
          year: yr.year,
          sem: yr.semester,
          name: sName,
          email: sEmail,
          roll: sRoll,
          status: sType,
          total: totalPaise / 100,
          outstanding: outstanding / 100,
          lateFee: lateFeeAccrued / 100,
        });
      }
    }
  }

  console.log(`\n🎉 SEED COMPLETE! Created exactly ${createdStudents.length} students (4 per dept × year).`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
