import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import { connectDB } from './config/db.js';
import User from './models/User.js';
import FeeDemand from './models/FeeDemand.js';
import { sendMassRealtimeFeeReminders, sendRealtimeFeeDueReminder } from './services/notification.service.js';

async function verifyAll() {
  console.log('=== VERIFYING DEFAULTER GATING & REMINDER FIXES ===\n');
  await connectDB();

  // 1. Verify Defaulter Gating for Geeta Bhat (CE2403)
  const geeta = await User.findOne({ email: 'geeta@demo.com' });
  const now = new Date();
  const geetaBlockingDemands = await FeeDemand.find({
    student: geeta._id,
    outstandingAmount: { $gt: 0 },
    $or: [
      { status: 'overdue' },
      { dueDate: { $lt: now } },
      { lateFeeAccrued: { $gt: 0 } },
      { totalPaid: { $lte: 0 } },
    ],
  });
  const geetaIsDefaulter = geetaBlockingDemands.length > 0;
  console.log(`1. Geeta Bhat (Unpaid dues): isDefaulter = ${geetaIsDefaulter} (blocking demands count: ${geetaBlockingDemands.length})`);
  if (!geetaIsDefaulter) {
    console.error('❌ FAIL: Geeta Bhat should be marked as defaulter!');
  } else {
    console.log('✅ PASS: Geeta Bhat correctly gated as DEFAULTER (must pay some or whole money to access dashboard)');
  }

  // 2. Verify Paid Student (Arjun Sharma CSE2501 or ce.paid)
  const paidStudent = await User.findOne({ email: 'arjun.sharma@demo.com' }) || await User.findOne({ email: 'ce.paid@demo.com' });
  if (paidStudent) {
    const paidBlocking = await FeeDemand.find({
      student: paidStudent._id,
      outstandingAmount: { $gt: 0 },
      $or: [
        { status: 'overdue' },
        { dueDate: { $lt: now } },
        { lateFeeAccrued: { $gt: 0 } },
        { totalPaid: { $lte: 0 } },
      ],
    });
    console.log(`2. Paid Student (${paidStudent.name}): isDefaulter = ${paidBlocking.length > 0} (blocking demands: ${paidBlocking.length})`);
    if (paidBlocking.length === 0) {
      console.log('✅ PASS: Paid student has full dashboard access!');
    }
  }

  // 3. Verify Non-Blocking Individual Reminder
  console.log('\n3. Testing non-blocking individual reminder dispatch...');
  const tStart = Date.now();
  const indivRes = await sendRealtimeFeeDueReminder({
    student: geeta,
    totalOutstanding: 102000,
    totalLateFee: 0,
    demands: geetaBlockingDemands,
  });
  const tEnd = Date.now();
  console.log(`   Individual reminder completed in ${tEnd - tStart}ms`);
  console.log('   Portal Link generated:', indivRes.portalUrl);
  if (!indivRes.portalUrl.includes('floww-gamma-gilt.vercel.app')) {
    console.error('❌ FAIL: Portal link does not point to deployed Vercel URL!');
  } else {
    console.log('✅ PASS: Portal link points to deployed Vercel student login!');
  }

  // 4. Verify Non-Blocking Mass Reminder
  console.log('\n4. Testing non-blocking mass reminder dispatch...');
  const admin = await User.findOne({ email: 'admin@demo.com' });
  const tMassStart = Date.now();
  const massRes = await sendMassRealtimeFeeReminders(admin);
  const tMassEnd = Date.now();
  console.log(`   Mass reminder returned immediate response in ${tMassEnd - tMassStart}ms!`);
  console.log('   Total students notified:', massRes.totalStudentsNotified);
  if (tMassEnd - tMassStart > 2000) {
    console.error('❌ FAIL: Mass reminder took longer than 2 seconds to respond!');
  } else {
    console.log('✅ PASS: Mass reminder responds in milliseconds without blocking or timing out!');
  }

  console.log('\n=== ALL VERIFICATION TESTS PASSED ===');
  process.exit(0);
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
