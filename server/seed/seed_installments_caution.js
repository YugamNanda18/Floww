import mongoose from 'mongoose';
import '../models/index.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';
import InstallmentPlan from '../models/InstallmentPlan.js';
import CautionMoney from '../models/CautionMoney.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  // 1. Clean old installment plans
  await InstallmentPlan.deleteMany({});
  console.log('Cleaned old installment plans.');

  // Find admin user
  const admin = await User.findOne({ role: 'admin' });

  // Find active student with unpaid demand
  const csePending = await User.findOne({ email: 'cse.pending@demo.com' });
  if (csePending) {
    const csePendingDemand = await FeeDemand.findOne({ student: csePending._id, status: { $ne: 'paid' } });
    if (csePendingDemand) {
      const total = csePendingDemand.outstandingAmount || csePendingDemand.totalDemanded || 6500000;
      const count = 3;
      const slotAmount = Math.floor(total / count);
      const slots = [
        { slotNumber: 1, dueDate: new Date(Date.now() + 15 * 86400000), amount: slotAmount, status: 'pending' },
        { slotNumber: 2, dueDate: new Date(Date.now() + 45 * 86400000), amount: slotAmount, status: 'pending' },
        { slotNumber: 3, dueDate: new Date(Date.now() + 75 * 86400000), amount: total - (slotAmount * 2), status: 'pending' }
      ];
      const plan = await InstallmentPlan.create({
        name: '3-Part Semester Split Plan',
        demand: csePendingDemand._id,
        student: csePending._id,
        installments: slots,
        totalAmount: total,
        createdBy: admin ? admin._id : null,
        status: 'active'
      });
      csePendingDemand.installmentPlan = plan._id;
      await csePendingDemand.save();
      console.log('Created clean active installment plan for Aarav Gupta (cse.pending@demo.com)');
    }
  }

  // 2. Caution Money Setup: Some Held, Some Paid Back / Refunded
  await CautionMoney.deleteMany({});
  console.log('Cleaned old caution money.');

  const students = await User.find({ role: 'student' });
  const refundedEmails = ['student@demo.com', 'ece.paid@demo.com', 'me.paid@demo.com', 'ce.paid@demo.com'];

  for (const s of students) {
    const isRefunded = refundedEmails.includes(s.email);
    const depositAmount = 1000000; // 10,000 INR in paise

    if (isRefunded) {
      await CautionMoney.create({
        student: s._id,
        depositAmount,
        depositDate: new Date('2023-07-15'),
        status: 'refunded',
        refundAmount: depositAmount,
        refundDate: new Date('2025-06-20'),
        refundApprovedBy: admin ? admin._id : null,
        refundTransactionRef: 'NEFT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        refundMode: 'bank_transfer',
        notes: 'Graduation / No-Dues Clearance successfully settled & caution deposit refunded'
      });
    } else {
      await CautionMoney.create({
        student: s._id,
        depositAmount,
        depositDate: new Date('2024-07-20'),
        status: 'held',
        refundAmount: 0,
        notes: 'Institutional security deposit held in college treasury escrow'
      });
    }
  }

  const heldCount = await CautionMoney.countDocuments({ status: 'held' });
  const refundedCount = await CautionMoney.countDocuments({ status: 'refunded' });
  console.log(`Caution Money setup complete: ${heldCount} HELD, ${refundedCount} REFUNDED (PAID BACK).`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
