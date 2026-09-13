/**
 * ═══════════════════════════════════════════════════════════════════
 *  LedgerX — Comprehensive Demo Seed Script
 *  Creates a full institute snapshot:
 *   ✅ 4 departments, all 8 semesters, 40 students
 *   ✅ Fee structures for every dept × semester
 *   ✅ Fee demands with real component breakdowns
 *   ✅ Paid students (online UPI/card, offline DD)
 *   ✅ Partial payers, defaulters, overdue with late fees
 *   ✅ Scholarship recipients (merit + category-based)
 *   ✅ Installment plan holders
 *   ✅ Caution money deposits + one refunded graduation case
 *   ✅ Double-entry ledger entries for every transaction
 *   ✅ SHA-256 receipts for every captured payment
 *   ✅ Late fee rules per department
 *   ✅ Audit trail entries for admin overrides
 * ═══════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import User          from '../models/User.js';
import Department    from '../models/Department.js';
import FeeStructure  from '../models/FeeStructure.js';
import FeeDemand     from '../models/FeeDemand.js';
import Transaction   from '../models/Transaction.js';
import LedgerEntry   from '../models/LedgerEntry.js';
import Receipt       from '../models/Receipt.js';
import CautionMoney  from '../models/CautionMoney.js';
import LateFeeRule   from '../models/LateFeeRule.js';
import AuditLog      from '../models/AuditLog.js';

const MONGO_URI      = process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx';
const DEMO_PASSWORD  = 'demo123';
const SALT_ROUNDS    = 12;
const RECEIPT_SALT   = process.env.RECEIPT_HASH_SALT || 'ledgerx_sha256_salt';

// ─── Helpers ──────────────────────────────────────────────────────────────
const paise = (rupees) => Math.round(rupees * 100);
const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const daysFrom = (n) => new Date(Date.now() + n * 86400000);

let receiptSeq = 1000;
const nextReceiptNo = () => `RX${new Date().getFullYear()}${String(++receiptSeq).padStart(6,'0')}`;

const makeJournalId = () => uuidv4();
const sha256 = (data) => crypto.createHash('sha256').update(data + RECEIPT_SALT).digest('hex');

const log = (icon, msg) => console.log(`  ${icon}  ${msg}`);

// ─── Post a double-entry journal pair ─────────────────────────────────────
async function postJournal({ journalId, debitAccount, creditAccount, amount, narration, student, demand, txn }) {
  const base = { journalId, amount, narration, relatedStudent: student, relatedDemand: demand, relatedTransaction: txn, postedByLabel: 'SEED' };
  await LedgerEntry.insertMany([
    { ...base, type: 'debit',  account: debitAccount  },
    { ...base, type: 'credit', account: creditAccount },
  ]);
}

// ─── Create a captured payment + receipt ─────────────────────────────────
async function createPayment({ studentId, demandDoc, amount, method, paidAt, razorpayId, ddNo }) {
  const txn = await Transaction.create({
    idempotencyKey: uuidv4(),
    razorpayOrderId: `order_${uuidv4().slice(0,16)}`,
    razorpayPaymentId: razorpayId || `pay_${uuidv4().slice(0,16)}`,
    amount,
    method,
    status: 'captured',
    student: studentId,
    demand: demandDoc._id,
    webhookVerified: true,
    capturedAt: paidAt || new Date(),
    offlineDetails: ddNo ? { ddNumber: ddNo, bankName: 'SBI', bankBranch: 'Main Branch' } : {},
    createdAt: paidAt || new Date(),
  });

  // Post ledger entries
  await postJournal({
    journalId: makeJournalId(),
    debitAccount: method.startsWith('offline') ? 'Bank / Cash' : 'Bank / Cash',
    creditAccount: 'Student Fee Receivable',
    amount,
    narration: `Fee payment — ${demandDoc.academicYear} Sem ${demandDoc.semester}`,
    student: studentId,
    demand: demandDoc._id,
    txn: txn._id,
  });

  // Receipt
  const receiptNo = nextReceiptNo();
  const hash = sha256(`${receiptNo}:${amount}:${studentId}`);
  await Receipt.create({
    receiptNumber: receiptNo,
    transaction: txn._id,
    student: studentId,
    demand: demandDoc._id,
    amountPaid: amount,
    components: demandDoc.components.map(c => ({ name: c.name, amount: c.demandedAmount })),
    paymentMethod: method,
    paymentReference: txn.razorpayPaymentId,
    academicYear: demandDoc.academicYear,
    semester: demandDoc.semester,
    sha256Hash: hash,
    verificationUrl: `http://localhost:5000/api/payment/verify-receipt/${hash}`,
    issuedAt: paidAt || new Date(),
  });

  return txn;
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN SEED
// ──────────────────────────────────────────────────────────────────────────
const seed = async () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   LedgerX — Full Demo Data Seeder             ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  log('✅', `Connected → ${MONGO_URI}`);

  // ── Wipe slate ──────────────────────────────────────────────────────────
  console.log('\n  🗑️  Clearing old demo data...');
  await Promise.all([
    User.deleteMany({ email: { $regex: /@demo\.com$/ } }),
    Department.deleteMany({}),
    FeeStructure.deleteMany({}),
    FeeDemand.deleteMany({}),
    Transaction.deleteMany({}),
    LedgerEntry.deleteMany({}),
    Receipt.deleteMany({}),
    CautionMoney.deleteMany({}),
    LateFeeRule.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  log('✅', 'Cleared');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // ════════════════════════════════════════════════════════════
  // 1. DEPARTMENTS
  // ════════════════════════════════════════════════════════════
  console.log('\n  📁  Creating Departments...');
  const deptDefs = [
    { name: 'Computer Science & Engineering', code: 'CSE', head: 'Dr. Arvind Sharma',      totalSeats: 120 },
    { name: 'Electronics & Communication',    code: 'ECE', head: 'Dr. Priya Mehta',        totalSeats: 60  },
    { name: 'Mechanical Engineering',         code: 'ME',  head: 'Dr. Suresh Verma',       totalSeats: 60  },
    { name: 'Civil Engineering',              code: 'CE',  head: 'Dr. Kavitha Nair',        totalSeats: 60  },
  ];
  const depts = {};
  for (const d of deptDefs) {
    const dept = await Department.create(d);
    depts[d.code] = dept;
    log('📁', `${d.name} (${d.code})`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. ADMIN USERS
  // ════════════════════════════════════════════════════════════
  console.log('\n  👤  Creating Admin/Superuser...');
  const [adminUser, superUser] = await User.insertMany([
    { name: 'Rajesh Kumar (Admin)', email: 'admin@demo.com', employeeId: 'ADM001', passwordHash, role: 'admin', isActive: true },
    { name: 'Dr. Sita Rao (Superuser)', email: 'super@demo.com', employeeId: 'SUP001', passwordHash, role: 'superuser', isActive: true },
  ]);
  log('✅', `ADM001 (admin@demo.com)  |  SUP001 (super@demo.com)`);

  // ════════════════════════════════════════════════════════════
  // 3. FEE STRUCTURES (all 8 sems × 4 depts)
  // ════════════════════════════════════════════════════════════
  console.log('\n  📋  Creating Fee Structures (8 sems × 4 depts)...');

  // Base tuition per dept per sem (in rupees)
  const baseTuition = { CSE: 85000, ECE: 75000, ME: 70000, CE: 65000 };
  // Year-on-year batch → academicYear mapping
  const semYearMap = {
    1: '2024-25', 2: '2024-25',
    3: '2023-24', 4: '2023-24',
    5: '2022-23', 6: '2022-23',
    7: '2021-22', 8: '2021-22',
  };
  const semBatchMap = { 1:'2024-28',2:'2024-28',3:'2023-27',4:'2023-27',5:'2022-26',6:'2022-26',7:'2021-25',8:'2021-25' };
  const semDueDateMap = {
    1: daysAgo(120), 2: daysAgo(30),
    3: daysAgo(180), 4: daysAgo(90),
    5: daysAgo(240), 6: daysAgo(150),
    7: daysAgo(310), 8: daysAgo(220),
  };

  const feeStructures = {};
  for (const [code, dept] of Object.entries(depts)) {
    feeStructures[code] = {};
    for (let sem = 1; sem <= 8; sem++) {
      const tuition = paise(baseTuition[code]);
      const hasLab  = [1, 2, 3, 5].includes(sem);
      const components = [
        { name: 'Tuition',     amount: tuition,           description: 'Academic instruction fees' },
        { name: 'CRT',         amount: paise(5000),        description: 'Campus Recruitment Training' },
        { name: 'Development', amount: paise(8000),        description: 'Infrastructure development' },
        { name: 'Exam',        amount: paise(3000),        description: 'End semester exam fees' },
        { name: 'Library',     amount: paise(2000),        description: 'Library & digital resources' },
        { name: 'Sports',      amount: paise(1500),        description: 'Sports & gymnasium' },
        ...(hasLab ? [{ name: 'Lab', amount: paise(6000), description: 'Laboratory consumables' }] : []),
      ];
      const total = components.reduce((s, c) => s + c.amount, 0);
      const fs = await FeeStructure.create({
        department: dept._id,
        batch: semBatchMap[sem],
        semester: sem,
        academicYear: semYearMap[sem],
        components,
        totalAmount: total,
        dueDate: semDueDateMap[sem],
        gracePeriodDays: 7,
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: adminUser._id,
        isActive: true,
      });
      feeStructures[code][sem] = fs;
    }
  }
  log('✅', '32 fee structures created');

  // ════════════════════════════════════════════════════════════
  // 4. LATE FEE RULES
  // ════════════════════════════════════════════════════════════
  console.log('\n  ⏰  Creating Late Fee Rules...');
  // One rule per dept — attach to sem 1 fee structure (representative)
  const lateFeeRulesList = [];
  for (const [code, dept] of Object.entries(depts)) {
    const fs1 = feeStructures[code][1];
    const rule = await LateFeeRule.create({
      feeStructure: fs1._id,
      ruleType: ['CSE','ME'].includes(code) ? 'dailyPercentage' : 'flat',
      flatAmount: ['ECE','CE'].includes(code) ? paise(code==='ECE'?500:300) : 0,
      dailyRate: code === 'CSE' ? 0.05 : code === 'ME' ? 0.03 : 0,
      maxCap: paise(code==='CSE'?5000:code==='ECE'?3000:code==='ME'?3000:2000),
      effectiveAfterDays: 7,
      isActive: true,
      createdBy: adminUser._id,
    });
    lateFeeRulesList.push({ code, rule });
  }
  const lateFeeRules = Object.fromEntries(lateFeeRulesList.map(r => [r.code, r.rule]));
  log('✅', '4 late fee rules created');

  // ════════════════════════════════════════════════════════════
  // 5. STUDENTS (40 across 8 sems × 4 depts)
  // ════════════════════════════════════════════════════════════
  console.log('\n  👨‍🎓  Creating 40 Students...');

  // name, scenario, dept, sem
  const studentDefs = [
    // ── CSE Students ──
    { name:'Rahul Sharma',      email:'student@demo.com',      roll:'CSE24001', dept:'CSE', sem:1, batch:'2024-28', scenario:'fully_paid'   },
    { name:'Sneha Patel',       email:'sneha@demo.com',        roll:'CSE24002', dept:'CSE', sem:1, batch:'2024-28', scenario:'pending'      },
    { name:'Arjun Mehta',       email:'arjun@demo.com',        roll:'CSE23001', dept:'CSE', sem:3, batch:'2023-27', scenario:'partial'      },
    { name:'Divya Nair',        email:'divya@demo.com',        roll:'CSE23002', dept:'CSE', sem:3, batch:'2023-27', scenario:'scholarship'  },
    { name:'Rohit Gupta',       email:'rohit@demo.com',        roll:'CSE22001', dept:'CSE', sem:5, batch:'2022-26', scenario:'defaulter'    },
    { name:'Ananya Singh',      email:'ananya@demo.com',       roll:'CSE22002', dept:'CSE', sem:5, batch:'2022-26', scenario:'fully_paid'   },
    { name:'Vikram Yadav',      email:'vikram@demo.com',       roll:'CSE21001', dept:'CSE', sem:7, batch:'2021-25', scenario:'installment'  },
    { name:'Priya Verma',       email:'priya@demo.com',        roll:'CSE21002', dept:'CSE', sem:7, batch:'2021-25', scenario:'fully_paid'   },
    { name:'Karan Joshi',       email:'karan@demo.com',        roll:'CSE24003', dept:'CSE', sem:2, batch:'2024-28', scenario:'overdue'      },
    { name:'Meena Pillai',      email:'meena@demo.com',        roll:'CSE24004', dept:'CSE', sem:2, batch:'2024-28', scenario:'pending'      },

    // ── ECE Students ──
    { name:'Suresh Reddy',      email:'suresh@demo.com',       roll:'ECE24001', dept:'ECE', sem:1, batch:'2024-28', scenario:'fully_paid'   },
    { name:'Lakshmi Kumar',     email:'lakshmi@demo.com',      roll:'ECE24002', dept:'ECE', sem:1, batch:'2024-28', scenario:'partial'      },
    { name:'Akhil Rao',         email:'akhil@demo.com',        roll:'ECE23001', dept:'ECE', sem:3, batch:'2023-27', scenario:'defaulter'    },
    { name:'Pooja Desai',       email:'pooja@demo.com',        roll:'ECE23002', dept:'ECE', sem:3, batch:'2023-27', scenario:'fully_paid'   },
    { name:'Sanjay Iyer',       email:'sanjay@demo.com',       roll:'ECE22001', dept:'ECE', sem:5, batch:'2022-26', scenario:'overdue'      },
    { name:'Kavya Krishnan',    email:'kavya@demo.com',        roll:'ECE22002', dept:'ECE', sem:5, batch:'2022-26', scenario:'scholarship'  },
    { name:'Ravi Tiwari',       email:'ravi@demo.com',         roll:'ECE21001', dept:'ECE', sem:7, batch:'2021-25', scenario:'fully_paid'   },
    { name:'Anjali Mishra',     email:'anjali@demo.com',       roll:'ECE21002', dept:'ECE', sem:7, batch:'2021-25', scenario:'installment'  },
    { name:'Vivek Sharma',      email:'vivek@demo.com',        roll:'ECE24003', dept:'ECE', sem:4, batch:'2023-27', scenario:'pending'      },
    { name:'Nisha Pandey',      email:'nisha@demo.com',        roll:'ECE24004', dept:'ECE', sem:4, batch:'2023-27', scenario:'defaulter'    },

    // ── ME Students ──
    { name:'Aditya Singh',      email:'aditya@demo.com',       roll:'ME24001',  dept:'ME',  sem:1, batch:'2024-28', scenario:'fully_paid'   },
    { name:'Shruti Jain',       email:'shruti@demo.com',       roll:'ME24002',  dept:'ME',  sem:1, batch:'2024-28', scenario:'pending'      },
    { name:'Manoj Kumar',       email:'manoj@demo.com',        roll:'ME23001',  dept:'ME',  sem:3, batch:'2023-27', scenario:'partial'      },
    { name:'Geeta Bhat',        email:'geeta@demo.com',        roll:'ME23002',  dept:'ME',  sem:3, batch:'2023-27', scenario:'overdue'      },
    { name:'Harish Menon',      email:'harish@demo.com',       roll:'ME22001',  dept:'ME',  sem:5, batch:'2022-26', scenario:'defaulter'    },
    { name:'Deepa Varma',       email:'deepa@demo.com',        roll:'ME22002',  dept:'ME',  sem:5, batch:'2022-26', scenario:'fully_paid'   },
    { name:'Nikhil Rajan',      email:'nikhil@demo.com',       roll:'ME21001',  dept:'ME',  sem:7, batch:'2021-25', scenario:'scholarship'  },
    { name:'Usha Thomas',       email:'usha@demo.com',         roll:'ME21002',  dept:'ME',  sem:7, batch:'2021-25', scenario:'fully_paid'   },
    { name:'Chetan Bansal',     email:'chetan@demo.com',       roll:'ME24003',  dept:'ME',  sem:6, batch:'2022-26', scenario:'installment'  },
    { name:'Shalini Nair',      email:'shalini@demo.com',      roll:'ME24004',  dept:'ME',  sem:6, batch:'2022-26', scenario:'pending'      },

    // ── CE Students ──
    { name:'Ajay Dubey',        email:'ajay@demo.com',         roll:'CE24001',  dept:'CE',  sem:1, batch:'2024-28', scenario:'fully_paid'   },
    { name:'Rekha Patil',       email:'rekha@demo.com',        roll:'CE24002',  dept:'CE',  sem:1, batch:'2024-28', scenario:'defaulter'    },
    { name:'Sumit Yadav',       email:'sumit@demo.com',        roll:'CE23001',  dept:'CE',  sem:3, batch:'2023-27', scenario:'partial'      },
    { name:'Hema Reddy',        email:'hema@demo.com',         roll:'CE23002',  dept:'CE',  sem:3, batch:'2023-27', scenario:'fully_paid'   },
    { name:'Preeti Shah',       email:'preeti@demo.com',       roll:'CE22001',  dept:'CE',  sem:5, batch:'2022-26', scenario:'overdue'      },
    { name:'Vinod Chauhan',     email:'vinod@demo.com',        roll:'CE22002',  dept:'CE',  sem:5, batch:'2022-26', scenario:'scholarship'  },
    { name:'Neha Kapoor',       email:'neha@demo.com',         roll:'CE21001',  dept:'CE',  sem:8, batch:'2021-25', scenario:'fully_paid'   },  // Final sem
    { name:'Ramesh Nayak',      email:'ramesh@demo.com',       roll:'CE21002',  dept:'CE',  sem:8, batch:'2021-25', scenario:'installment'  },  // Final sem
    { name:'Sunita Bose',       email:'sunita@demo.com',       roll:'CE24003',  dept:'CE',  sem:6, batch:'2022-26', scenario:'defaulter'    },
    { name:'Tarun Malhotra',    email:'tarun@demo.com',        roll:'CE24004',  dept:'CE',  sem:6, batch:'2022-26', scenario:'pending'      },
  ];

  const createdStudents = [];
  for (const sd of studentDefs) {
    const user = await User.collection.insertOne({
      name: sd.name, email: sd.email, passwordHash, role: 'student',
      rollNumber: sd.roll, department: depts[sd.dept]._id,
      batch: sd.batch, currentSemester: sd.sem, phone: `98765${Math.floor(10000+Math.random()*89999)}`,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    createdStudents.push({ ...sd, _id: user.insertedId });
  }
  log('✅', `${createdStudents.length} students created`);

  // ════════════════════════════════════════════════════════════
  // 6. FEE DEMANDS + TRANSACTIONS + LEDGER + RECEIPTS
  // ════════════════════════════════════════════════════════════
  console.log('\n  💰  Creating Fee Demands, Payments, Ledger Entries, Receipts...');

  let paidCount=0, pendingCount=0, overdueCount=0, partialCount=0;

  for (const s of createdStudents) {
    const fs = feeStructures[s.dept][s.sem];
    if (!fs) continue;

    const demanded = fs.totalAmount;
    const dueDate  = fs.dueDate;
    const isOverdue = new Date() > dueDate;
    const lateFeeDays = isOverdue ? Math.floor((new Date() - dueDate) / 86400000) : 0;
    const lateRule = lateFeeRules[s.dept];
    // Simplified late fee calc for seed purposes
    const lateAccrued = isOverdue && lateRule
      ? Math.min(
          lateRule.ruleType === 'dailyPercentage'
            ? Math.floor(demanded * (lateRule.dailyRate / 100) * Math.min(lateFeeDays, 60))
            : lateRule.flatAmount,
          lateRule.maxCap || paise(5000)
        )
      : 0;

    const components = fs.components.map(c => ({
      name: c.name, demandedAmount: c.amount, paidAmount: 0, waivedAmount: 0, status: 'pending',
    }));

    let demandData = {
      student: s._id, feeStructure: fs._id, semester: s.sem,
      academicYear: fs.academicYear, dueDate, components,
      totalDemanded: demanded, totalPaid: 0, totalWaived: 0,
      outstandingAmount: demanded, status: 'pending',
      lateFeeRule: lateRule?._id,
    };

    // ── Adjust by scenario ─────────────────────────────────────
    let paidAt = daysAgo(Math.floor(5 + Math.random() * 60));

    if (s.scenario === 'fully_paid') {
      demandData.totalPaid = demanded;
      demandData.outstandingAmount = 0;
      demandData.status = 'paid';
      demandData.components = components.map(c => ({ ...c, paidAmount: c.demandedAmount, status: 'paid' }));

    } else if (s.scenario === 'partial') {
      const partial = Math.floor(demanded * 0.6);
      demandData.totalPaid = partial;
      demandData.outstandingAmount = demanded - partial;
      demandData.status = 'partial';
      demandData.components = components.map((c, i) => i === 0
        ? { ...c, paidAmount: partial, status: 'partial' }
        : { ...c, status: 'pending' });

    } else if (s.scenario === 'scholarship') {
      const scholarship = paise(20000);
      demandData.totalPaid = demanded - scholarship;
      demandData.totalWaived = 0;
      demandData.scholarshipAmount = scholarship;
      demandData.scholarshipReason = 'Merit scholarship — Top 5% academic performance';
      demandData.scholarshipAppliedBy = adminUser._id;
      demandData.outstandingAmount = 0;
      demandData.status = 'paid';
      demandData.components = components.map(c => ({ ...c, paidAmount: c.demandedAmount, status: 'paid' }));

    } else if (s.scenario === 'installment') {
      const installPaid = Math.floor(demanded * 0.33);
      demandData.totalPaid = installPaid;
      demandData.outstandingAmount = demanded - installPaid;
      demandData.status = 'partial';
      demandData.components = components.map((c, i) => i < 2
        ? { ...c, paidAmount: c.demandedAmount, status: 'paid' }
        : { ...c, status: 'pending' });

    } else if (s.scenario === 'defaulter') {
      demandData.status = 'overdue';
      demandData.lateFeeAccrued = lateAccrued;
      demandData.outstandingAmount = demanded + lateAccrued;

    } else if (s.scenario === 'overdue') {
      const partial = Math.floor(demanded * 0.4);
      demandData.totalPaid = partial;
      demandData.status = 'overdue';
      demandData.lateFeeAccrued = lateAccrued;
      demandData.outstandingAmount = demanded - partial + lateAccrued;
      demandData.components = components.map((c, i) => i === 0
        ? { ...c, paidAmount: partial, status: 'partial' }
        : { ...c });
    }
    // 'pending' stays as-is

    const demand = await FeeDemand.create(demandData);

    // ── Create initial DR Student Fee Receivable journal ───────
    await postJournal({
      journalId: makeJournalId(),
      debitAccount:  'Student Fee Receivable',
      creditAccount: 'Fee Income',
      amount: demanded,
      narration: `Fee demand raised — ${fs.academicYear} Sem ${s.sem}`,
      student: s._id, demand: demand._id,
    });

    // ── Create payment transactions for paid/partial/scholarship/installment ──
    if (['fully_paid','scholarship'].includes(s.scenario)) {
      const method = ['upi','card','netbanking'][Math.floor(Math.random()*3)];
      await createPayment({ studentId: s._id, demandDoc: demand, amount: demand.totalPaid, method, paidAt });
      paidCount++;

      if (s.scenario === 'scholarship') {
        await postJournal({
          journalId: makeJournalId(),
          debitAccount: 'Scholarship Expense',
          creditAccount: 'Student Fee Receivable',
          amount: demand.scholarshipAmount,
          narration: `Scholarship applied: ${demand.scholarshipReason}`,
          student: s._id, demand: demand._id,
        });
        await AuditLog.create({
          adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
          action: 'apply_scholarship', targetEntity: `Demand:${demand._id}`,
          reason: demand.scholarshipReason, amountAffected: demand.scholarshipAmount,
          timestamp: paidAt,
        });
      }

    } else if (s.scenario === 'partial') {
      const method = ['upi','card'][Math.floor(Math.random()*2)];
      await createPayment({ studentId: s._id, demandDoc: demand, amount: demand.totalPaid, method, paidAt });
      partialCount++;

    } else if (s.scenario === 'installment') {
      await createPayment({ studentId: s._id, demandDoc: demand, amount: demand.totalPaid, method: 'netbanking', paidAt: daysAgo(30) });
      partialCount++;

    } else if (s.scenario === 'overdue') {
      if (demand.totalPaid > 0) {
        await createPayment({ studentId: s._id, demandDoc: demand, amount: demand.totalPaid, method: 'upi', paidAt: daysAgo(90) });
      }
      // Post late fee accrual
      if (lateAccrued > 0) {
        await postJournal({
          journalId: makeJournalId(),
          debitAccount: 'Late Fee Receivable',
          creditAccount: 'Late Fee Income',
          amount: lateAccrued,
          narration: `Late fee accrued — ${lateFeeDays} days overdue`,
          student: s._id, demand: demand._id,
        });
      }
      overdueCount++;

    } else if (s.scenario === 'defaulter') {
      // Offline DD payment attempt — pending_approval
      await Transaction.create({
        idempotencyKey: uuidv4(),
        amount: demanded,
        method: 'offline_dd',
        status: 'pending_approval',
        student: s._id, demand: demand._id,
        offlineDetails: {
          ddNumber: `DD${Math.floor(100000+Math.random()*899999)}`,
          bankName: 'Bank of Baroda',
          bankBranch: 'City Branch',
          instrumentDate: daysAgo(3),
        },
        createdAt: daysAgo(3),
      });
      if (lateAccrued > 0) {
        await postJournal({
          journalId: makeJournalId(),
          debitAccount: 'Late Fee Receivable',
          creditAccount: 'Late Fee Income',
          amount: lateAccrued,
          narration: `Late fee — defaulter ${s.roll}`,
          student: s._id, demand: demand._id,
        });
      }
      overdueCount++;
      await AuditLog.create({
        adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
        action: 'approve_offline_payment', targetEntity: `Student:${s.roll}`,
        reason: 'DD submitted — pending bank verification', amountAffected: demanded,
        beforeState: { status: 'pending_approval' },
        afterState:  { status: 'captured' },
        timestamp: daysAgo(2),
      });

    } else {
      pendingCount++;
    }
  }

  log('✅', `Demands: ${paidCount} paid | ${partialCount} partial | ${pendingCount} pending | ${overdueCount} overdue/defaulter`);

  // ════════════════════════════════════════════════════════════
  // 7. CAUTION MONEY (all students — final sem gets refunded)
  // ════════════════════════════════════════════════════════════
  console.log('\n  🏦  Creating Caution Money Records...');

  for (const s of createdStudents) {
    const depositAmt = s.dept === 'CSE' ? paise(5000) : paise(3000);
    const isFinalSem = s.sem === 8;

    await CautionMoney.create({
      student: s._id,
      depositAmount: depositAmt,
      depositDate: new Date(`20${s.batch.slice(2,4)}-07-15`),
      status: isFinalSem ? 'refunded' : 'held',
      refundAmount: isFinalSem ? depositAmt - paise(200) : 0,
      refundDate: isFinalSem ? daysAgo(15) : undefined,
      refundApprovedBy: isFinalSem ? adminUser._id : undefined,
      refundMode: isFinalSem ? 'bank_transfer' : '',
      notes: isFinalSem
        ? 'Refunded on graduation — ₹200 deducted for damages'
        : 'Security deposit held until graduation',
    });
  }

  // Additional caution money ledger entries for deposited amounts
  for (const s of createdStudents) {
    const depositAmt = s.dept === 'CSE' ? paise(5000) : paise(3000);
    await postJournal({
      journalId: makeJournalId(),
      debitAccount: 'Bank / Cash',
      creditAccount: 'Caution Money Liability',
      amount: depositAmt,
      narration: `Caution money deposit — ${s.roll}`,
      student: s._id,
    });
  }
  log('✅', `${createdStudents.length} caution money records (${createdStudents.filter(s=>s.sem===8).length} refunded)`);

  // ════════════════════════════════════════════════════════════
  // 8. EXTRA AUDIT LOG ENTRIES
  // ════════════════════════════════════════════════════════════
  console.log('\n  📜  Creating Audit Trail...');

  await AuditLog.insertMany([
    {
      adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
      action: 'waive_late_fee', targetEntity: 'Student:CSE22001',
      reason: 'Medical emergency — student was hospitalised', amountAffected: paise(350),
      beforeState: { lateFeeAccrued: paise(350) }, afterState: { lateFeeAccrued: 0 },
      timestamp: daysAgo(10),
    },
    {
      adminId: superUser._id, adminName: superUser.name, adminEmail: superUser.email,
      action: 'create_fee_structure', targetEntity: 'FeeStructure:CSE-2024-25-Sem1',
      reason: 'Annual fee structure creation', amountAffected: paise(110500),
      timestamp: daysAgo(180),
    },
    {
      adminId: superUser._id, adminName: superUser.name, adminEmail: superUser.email,
      action: 'publish_fee_structure', targetEntity: 'FeeStructure:CSE-2024-25-Sem1',
      reason: 'Published for student access', amountAffected: 0,
      timestamp: daysAgo(179),
    },
    {
      adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
      action: 'apply_scholarship', targetEntity: 'Student:ECE22002',
      reason: 'SC/ST category fee waiver — academic year 2022-23', amountAffected: paise(20000),
      beforeState: { outstanding: paise(93000) }, afterState: { outstanding: paise(73000) },
      timestamp: daysAgo(60),
    },
    {
      adminId: superUser._id, adminName: superUser.name, adminEmail: superUser.email,
      action: 'bulk_student_upload', targetEntity: 'Batch:2024-28',
      reason: 'New batch onboarding — 40 students uploaded', amountAffected: 0,
      timestamp: daysAgo(200),
    },
    {
      adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
      action: 'disburse_caution_money', targetEntity: 'Student:CE21001',
      reason: 'Graduation disbursement — batch 2021-25', amountAffected: paise(2800),
      timestamp: daysAgo(15),
    },
    {
      adminId: adminUser._id, adminName: adminUser.name, adminEmail: adminUser.email,
      action: 'reject_offline_payment', targetEntity: 'Student:ECE24004',
      reason: 'DD signature mismatch — returned for correction', amountAffected: paise(93000),
      beforeState: { status: 'pending_approval' }, afterState: { status: 'failed' },
      timestamp: daysAgo(5),
    },
  ]);
  log('✅', '7 audit log entries');

  // ════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════
  const txnCount     = await Transaction.countDocuments();
  const ledgerCount  = await LedgerEntry.countDocuments();
  const receiptCount = await Receipt.countDocuments();
  const demandCount  = await FeeDemand.countDocuments();

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   🎉  LedgerX Demo Data — Seeding Complete!           ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  👨‍🎓 Students       : ${createdStudents.length} (8 sems × 4 depts)              ║`);
  console.log(`║  📋 Fee Structures  : 32                              ║`);
  console.log(`║  💸 Fee Demands     : ${demandCount}                              ║`);
  console.log(`║  💳 Transactions    : ${txnCount}                               ║`);
  console.log(`║  📒 Ledger Entries  : ${ledgerCount}                               ║`);
  console.log(`║  🧾 Receipts        : ${receiptCount}                               ║`);
  console.log(`║  🏦 Caution Money   : ${createdStudents.length} records                       ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  DEMO LOGIN CREDENTIALS                               ║');
  console.log('║  student@demo.com  / demo123  → Student Portal        ║');
  console.log('║  admin@demo.com    / demo123  → Admin Portal          ║');
  console.log('║  super@demo.com    / demo123  → Superuser Portal      ║');
  console.log('║                                                       ║');
  console.log('║  All 40 students: <roll>@demo.com  / demo123          ║');
  console.log('║  e.g.  rohit@demo.com  → Defaulter (Overdue + LF)    ║');
  console.log('║        divya@demo.com  → Scholarship recipient        ║');
  console.log('║        vikram@demo.com → Installment plan holder      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
