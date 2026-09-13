import mongoose from 'mongoose';
import crypto from 'crypto';
import '../models/index.js';
import User from '../models/User.js';
import FeeStructure from '../models/FeeStructure.js';
import FeeDemand from '../models/FeeDemand.js';
import Transaction from '../models/Transaction.js';
import Receipt from '../models/Receipt.js';
import { postDoubleEntry } from '../services/ledger.service.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  // Fix Rahul Sharma & Aarav Gupta to currentSemester 1 as specified in CSV roster
  await User.updateOne({ email: 'student@demo.com' }, { currentSemester: 1 });
  await User.updateOne({ email: 'cse.pending@demo.com' }, { currentSemester: 1 });
  console.log('Synchronized Rahul Sharma & Aarav Gupta to Sem 1.');

  const students = await User.find({ role: 'student' }).populate('department');
  const admin = await User.findOne({ role: 'admin' });

  for (const s of students) {
    const currentSem = s.currentSemester || 1;
    if (currentSem <= 1) {
      console.log(`Student ${s.name} (${s.rollNumber}) is in Sem 1 (Freshman, zero prior semesters).`);
      continue;
    }

    console.log(`\nGenerating past semester records for ${s.name} (${s.rollNumber}, Dept: ${s.department?.code}, Current: Sem ${currentSem})...`);

    // Generate past fee records for Sem 1 up to (currentSem - 1)
    for (let sem = 1; sem < currentSem; sem++) {
      // Find fee structure for this department & semester
      let feeStructure = await FeeStructure.findOne({
        department: s.department._id,
        semester: sem,
      });

      if (!feeStructure) {
        feeStructure = await FeeStructure.findOne({
          department: s.department._id,
        });
      }

      const totalPaise = feeStructure?.totalAmount || 9500000;
      const components = feeStructure?.components || [
        { name: 'Tuition Fee', amount: Math.round(totalPaise * 0.7) },
        { name: 'Laboratory & Tech Fee', amount: Math.round(totalPaise * 0.15) },
        { name: 'Library & Learning Resources', amount: Math.round(totalPaise * 0.1) },
        { name: 'Campus Facilities & Services', amount: Math.round(totalPaise * 0.05) },
      ];

      // Calculate past dates
      const monthsAgo = (currentSem - sem) * 6;
      const pastDueDate = new Date();
      pastDueDate.setMonth(pastDueDate.getMonth() - monthsAgo);
      const pastPaymentDate = new Date(pastDueDate);
      pastPaymentDate.setDate(pastPaymentDate.getDate() - 5);

      const pastAcademicYear = sem <= 2 ? '2023-24' : '2024-25';

      // 1. Find or create FeeDemand
      let demand = await FeeDemand.findOne({ student: s._id, semester: sem });
      if (!demand) {
        demand = await FeeDemand.create({
          student: s._id,
          feeStructure: feeStructure._id,
          semester: sem,
          academicYear: pastAcademicYear,
          dueDate: pastDueDate,
          totalDemanded: totalPaise,
          totalPaid: totalPaise,
          outstandingAmount: 0,
          lateFeeAccrued: 0,
          status: 'paid',
          components: components.map(c => ({
            name: c.name,
            demandedAmount: c.amount,
            paidAmount: c.amount,
            status: 'paid',
          })),
        });
      } else {
        demand.status = 'paid';
        demand.totalPaid = demand.totalDemanded;
        demand.outstandingAmount = 0;
        demand.lateFeeAccrued = 0;
        await demand.save();
      }

      // 2. Find or create captured Transaction
      const idempotencyKey = `past-paid-${s.rollNumber}-sem${sem}`;
      let txn = await Transaction.findOne({ idempotencyKey });
      if (!txn) {
        const methods = ['upi', 'netbanking', 'card', 'offline_dd'];
        const chosenMethod = methods[(sem + s.name.length) % methods.length];
        txn = await Transaction.create({
          idempotencyKey,
          amount: totalPaise,
          currency: 'INR',
          method: chosenMethod,
          status: 'captured',
          student: s._id,
          demand: demand._id,
          capturedAt: pastPaymentDate,
          razorpayPaymentId: chosenMethod !== 'offline_dd' ? `pay_past_${s.rollNumber}_s${sem}` : undefined,
          offlineDetails: chosenMethod === 'offline_dd' ? {
            ddNumber: `DD-SBI-${sem}09${s.rollNumber.slice(-3)}`,
            bankName: 'State Bank of India',
            bankBranch: 'Main University Branch',
            instrumentDate: pastPaymentDate,
            approvedBy: admin ? admin._id : null,
            approvedAt: pastPaymentDate,
          } : undefined,
        });
      }

      // 3. Find or create Receipt
      const receiptNumber = `REC-${s.rollNumber}-S${sem}`;
      let receipt = await Receipt.findOne({ receiptNumber });
      if (!receipt) {
        const hash = crypto.createHash('sha256').update(`${receiptNumber}-${s._id}-${totalPaise}`).digest('hex');
        receipt = await Receipt.create({
          receiptNumber,
          transaction: txn._id,
          student: s._id,
          demand: demand._id,
          amountPaid: totalPaise,
          components: demand.components.map(c => ({ name: c.name, amount: c.paidAmount })),
          paymentMethod: txn.method,
          paymentReference: txn.razorpayPaymentId || txn.offlineDetails?.ddNumber || 'BANK-REF-PAST',
          academicYear: pastAcademicYear,
          semester: sem,
          sha256Hash: hash,
          issuedAt: pastPaymentDate,
        });
      }

      // 4. Create balanced Double-Entry Ledger records for fee liability & settlement
      await postDoubleEntry({
        debitAccount: 'Student Fee Receivable',
        creditAccount: 'Tuition Fee Revenue',
        amount: totalPaise,
        narration: `Semester ${sem} Tuition Fee Assessment for ${s.name} (${s.rollNumber})`,
        studentId: s._id,
        demandId: demand._id,
        postedBy: admin ? admin._id : null,
        postedByLabel: 'SYSTEM_ASSESSMENT',
      });

      await postDoubleEntry({
        debitAccount: 'Bank Operating Account',
        creditAccount: 'Student Fee Receivable',
        amount: totalPaise,
        narration: `Semester ${sem} Fee Settlement Receipt ${receiptNumber} (${txn.method.toUpperCase()})`,
        studentId: s._id,
        demandId: demand._id,
        transactionId: txn._id,
        postedBy: admin ? admin._id : null,
        postedByLabel: 'SYSTEM_SETTLEMENT',
      });

      console.log(` - Generated Sem ${sem} records: Demand (₹${totalPaise/100}), Receipt ${receiptNumber}, Txn (${txn.method}).`);
    }
  }

  console.log('\nPast fee records, receipts, and ledger journals successfully created for all senior students!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
