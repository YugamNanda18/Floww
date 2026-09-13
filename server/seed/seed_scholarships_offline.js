import mongoose from 'mongoose';
import crypto from 'crypto';
import '../models/index.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';
import Transaction from '../models/Transaction.js';
import Receipt from '../models/Receipt.js';
import { postDoubleEntry } from '../services/ledger.service.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  const superuser = await User.findOne({ role: 'superuser' });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SCHOLARSHIPS & WAIVERS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('Seeding scholarships & waivers...');

  // A. Ritika Sen (ece.pending@demo.com) - ₹25,000 Merit Scholarship
  const ritika = await User.findOne({ email: 'ece.pending@demo.com' });
  if (ritika) {
    const demand = await FeeDemand.findOne({ student: ritika._id });
    if (demand) {
      const scholarshipPaise = 2500000; // ₹25,000
      demand.scholarshipAmount = scholarshipPaise;
      demand.scholarshipReason = 'Merit Scholarship — Top 5% Academic CGPA in ECE';
      demand.scholarshipAppliedBy = superuser ? superuser._id : admin._id;
      demand.outstandingAmount = Math.max(0, demand.totalDemanded - demand.totalPaid - demand.totalWaived - scholarshipPaise);
      await demand.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholarshipPaise,
        narration: `Merit scholarship granted to ${ritika.name} (${ritika.rollNumber})`,
        studentId: ritika._id,
        demandId: demand._id,
        postedBy: superuser ? superuser._id : admin._id,
        postedByLabel: superuser ? superuser.name : admin.name,
      });

      console.log(`Scholarship applied: Ritika Sen (₹25,000)`);
    }
  }

  // B. Alia Bhatt (ce.pending@demo.com) - ₹20,000 Women in STEM Bursary
  const alia = await User.findOne({ email: 'ce.pending@demo.com' });
  if (alia) {
    const demand = await FeeDemand.findOne({ student: alia._id });
    if (demand) {
      const scholarshipPaise = 2000000; // ₹20,000
      demand.scholarshipAmount = scholarshipPaise;
      demand.scholarshipReason = 'Women in Engineering STEM Bursary Grant';
      demand.scholarshipAppliedBy = superuser ? superuser._id : admin._id;
      demand.outstandingAmount = Math.max(0, demand.totalDemanded - demand.totalPaid - demand.totalWaived - scholarshipPaise);
      await demand.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholarshipPaise,
        narration: `STEM Bursary granted to ${alia.name} (${alia.rollNumber})`,
        studentId: alia._id,
        demandId: demand._id,
        postedBy: superuser ? superuser._id : admin._id,
        postedByLabel: superuser ? superuser.name : admin.name,
      });

      console.log(`Scholarship applied: Alia Bhatt (₹20,000)`);
    }
  }

  // C. Pooja Bhatia (me.pending@demo.com) - ₹15,000 Financial Need Bursary
  const pooja = await User.findOne({ email: 'me.pending@demo.com' });
  if (pooja) {
    const demand = await FeeDemand.findOne({ student: pooja._id });
    if (demand) {
      const scholarshipPaise = 1500000; // ₹15,000
      demand.scholarshipAmount = scholarshipPaise;
      demand.scholarshipReason = 'Dean Discretionary Financial Need Concession';
      demand.scholarshipAppliedBy = superuser ? superuser._id : admin._id;
      demand.outstandingAmount = Math.max(0, demand.totalDemanded - demand.totalPaid - demand.totalWaived - scholarshipPaise);
      await demand.save();

      await postDoubleEntry({
        debitAccount: 'Scholarship Expense',
        creditAccount: 'Student Fee Receivable',
        amount: scholarshipPaise,
        narration: `Need bursary granted to ${pooja.name} (${pooja.rollNumber})`,
        studentId: pooja._id,
        demandId: demand._id,
        postedBy: superuser ? superuser._id : admin._id,
        postedByLabel: superuser ? superuser.name : admin.name,
      });

      console.log(`Scholarship applied: Pooja Bhatia (₹15,000)`);
    }
  }

  // D. Rohit Gupta (rohit@demo.com) - Late Fee Waiver of ₹2,500
  const rohit = await User.findOne({ email: 'rohit@demo.com' });
  if (rohit) {
    const demand = await FeeDemand.findOne({ student: rohit._id });
    if (demand) {
      const waiverPaise = 250000; // ₹2,500
      demand.totalWaived = (demand.totalWaived || 0) + waiverPaise;
      demand.outstandingAmount = Math.max(0, demand.totalDemanded - demand.totalPaid - demand.totalWaived - (demand.scholarshipAmount || 0));
      await demand.save();

      await postDoubleEntry({
        debitAccount: 'Fee Concession Expense',
        creditAccount: 'Student Fee Receivable',
        amount: waiverPaise,
        narration: `Executive late fee relief for ${rohit.name} (${rohit.rollNumber})`,
        studentId: rohit._id,
        demandId: demand._id,
        postedBy: superuser ? superuser._id : admin._id,
        postedByLabel: superuser ? superuser.name : admin.name,
      });

      console.log(`Late fee waiver applied: Rohit Gupta (₹2,500)`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. OFFLINE PAYMENTS (CAPTURED + PENDING APPROVAL)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSeeding offline payments...');
  await Transaction.deleteMany({ method: { $in: ['offline_dd', 'offline_challan', 'offline_cash'] } });

  // A. Varun Dhawan (ece.paid@demo.com) - CAPTURED Demand Draft (₹60,000)
  const varun = await User.findOne({ email: 'ece.paid@demo.com' });
  if (varun) {
    const demand = await FeeDemand.findOne({ student: varun._id });
    if (demand) {
      const txn = await Transaction.create({
        idempotencyKey: `offline-dd-${Date.now()}-${varun._id}`,
        amount: 6000000,
        currency: 'INR',
        method: 'offline_dd',
        status: 'captured',
        student: varun._id,
        demand: demand._id,
        offlineDetails: {
          ddNumber: 'DD-HDFC-992104',
          bankName: 'HDFC Bank Ltd',
          bankBranch: 'Connaught Place Main Branch',
          instrumentDate: new Date('2025-06-15'),
          approvedBy: admin ? admin._id : null,
          approvedAt: new Date('2025-06-16'),
          remarks: 'Demand Draft cleared and reconciled against treasury account',
        },
        capturedAt: new Date('2025-06-16'),
      });

      const receiptHash = crypto.createHash('sha256').update(`${txn._id}-${varun._id}-6000000`).digest('hex');
      await Receipt.create({
        receiptNumber: 'REC-OFFLINE-001',
        transaction: txn._id,
        student: varun._id,
        demand: demand._id,
        amountPaid: 6000000,
        components: demand.components.map(c => ({ name: c.name, amount: Math.min(c.demandedAmount, 6000000) })),
        paymentMethod: 'offline_dd',
        paymentReference: 'DD-HDFC-992104',
        academicYear: demand.academicYear,
        semester: demand.semester,
        sha256Hash: receiptHash,
        issuedAt: new Date('2025-06-16'),
      });

      console.log('Created Captured DD: Varun Dhawan (₹60,000)');
    }
  }

  // B. Sameer Khan (me.paid@demo.com) - CAPTURED Bank Challan (₹50,000)
  const sameer = await User.findOne({ email: 'me.paid@demo.com' });
  if (sameer) {
    const demand = await FeeDemand.findOne({ student: sameer._id });
    if (demand) {
      const txn = await Transaction.create({
        idempotencyKey: `offline-chl-${Date.now()}-${sameer._id}`,
        amount: 5000000,
        currency: 'INR',
        method: 'offline_challan',
        status: 'captured',
        student: sameer._id,
        demand: demand._id,
        offlineDetails: {
          challanNo: 'CHL-SBI-882194',
          bankName: 'State Bank of India',
          bankBranch: 'University Campus Branch',
          instrumentDate: new Date('2025-06-18'),
          approvedBy: admin ? admin._id : null,
          approvedAt: new Date('2025-06-19'),
          remarks: 'Counter copy validated against bank scroll',
        },
        capturedAt: new Date('2025-06-19'),
      });

      const receiptHash = crypto.createHash('sha256').update(`${txn._id}-${sameer._id}-5000000`).digest('hex');
      await Receipt.create({
        receiptNumber: 'REC-OFFLINE-002',
        transaction: txn._id,
        student: sameer._id,
        demand: demand._id,
        amountPaid: 5000000,
        components: demand.components.map(c => ({ name: c.name, amount: Math.min(c.demandedAmount, 5000000) })),
        paymentMethod: 'offline_challan',
        paymentReference: 'CHL-SBI-882194',
        academicYear: demand.academicYear,
        semester: demand.semester,
        sha256Hash: receiptHash,
        issuedAt: new Date('2025-06-19'),
      });

      console.log('Created Captured Challan: Sameer Khan (₹50,000)');
    }
  }

  // C. Rajesh Koothrappali (ce.paid@demo.com) - CAPTURED Cash Counter Payment (₹45,000)
  const rajesh = await User.findOne({ email: 'ce.paid@demo.com' });
  if (rajesh) {
    const demand = await FeeDemand.findOne({ student: rajesh._id });
    if (demand) {
      const txn = await Transaction.create({
        idempotencyKey: `offline-cash-${Date.now()}-${rajesh._id}`,
        amount: 4500000,
        currency: 'INR',
        method: 'offline_cash',
        status: 'captured',
        student: rajesh._id,
        demand: demand._id,
        offlineDetails: {
          challanNo: 'CASH-TREASURY-042',
          bankName: 'Accounts Counter Desk',
          bankBranch: 'Main Administrative Block',
          instrumentDate: new Date('2025-06-20'),
          approvedBy: admin ? admin._id : null,
          approvedAt: new Date('2025-06-20'),
          remarks: 'Cash collected and safe deposited',
        },
        capturedAt: new Date('2025-06-20'),
      });

      const receiptHash = crypto.createHash('sha256').update(`${txn._id}-${rajesh._id}-4500000`).digest('hex');
      await Receipt.create({
        receiptNumber: 'REC-OFFLINE-003',
        transaction: txn._id,
        student: rajesh._id,
        demand: demand._id,
        amountPaid: 4500000,
        components: demand.components.map(c => ({ name: c.name, amount: Math.min(c.demandedAmount, 4500000) })),
        paymentMethod: 'offline_cash',
        paymentReference: 'CASH-TREASURY-042',
        academicYear: demand.academicYear,
        semester: demand.semester,
        sha256Hash: receiptHash,
        issuedAt: new Date('2025-06-20'),
      });

      console.log('Created Captured Cash Payment: Rajesh Koothrappali (₹45,000)');
    }
  }

  // D. Aarav Gupta (cse.pending@demo.com) - PENDING APPROVAL Demand Draft (₹35,000)
  const aarav = await User.findOne({ email: 'cse.pending@demo.com' });
  if (aarav) {
    const demand = await FeeDemand.findOne({ student: aarav._id });
    if (demand) {
      await Transaction.create({
        idempotencyKey: `offline-dd-pending-${Date.now()}-${aarav._id}`,
        amount: 3500000,
        currency: 'INR',
        method: 'offline_dd',
        status: 'pending_approval',
        student: aarav._id,
        demand: demand._id,
        offlineDetails: {
          ddNumber: 'DD-ICICI-441920',
          bankName: 'ICICI Bank',
          bankBranch: 'Cyber City Branch, Gurugram',
          instrumentDate: new Date('2025-08-28'),
          remarks: 'Semester tuition fee partial installment via Bank Demand Draft',
        },
      });

      console.log('Created Pending Approval DD: Aarav Gupta (₹35,000)');
    }
  }

  // E. Pooja Bhatia (me.pending@demo.com) - PENDING APPROVAL Bank Challan (₹25,000)
  if (pooja) {
    const demand = await FeeDemand.findOne({ student: pooja._id });
    if (demand) {
      await Transaction.create({
        idempotencyKey: `offline-chl-pending-${Date.now()}-${pooja._id}`,
        amount: 2500000,
        currency: 'INR',
        method: 'offline_challan',
        status: 'pending_approval',
        student: pooja._id,
        demand: demand._id,
        offlineDetails: {
          challanNo: 'CHL-PNB-553190',
          bankName: 'Punjab National Bank',
          bankBranch: 'University Avenue Branch',
          instrumentDate: new Date('2025-08-29'),
          remarks: 'Stamped counter student copy submitted at accounts desk',
        },
      });

      console.log('Created Pending Approval Challan: Pooja Bhatia (₹25,000)');
    }
  }

  await mongoose.disconnect();
  console.log('\nAll scholarship & offline payment records seeded successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
