import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import FeeDemand from './models/FeeDemand.js';
import Transaction from './models/Transaction.js';

async function checkDb() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx');
  console.log('Connected to DB');

  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    const demands = await FeeDemand.find({ student: u._id }).lean();
    console.log(`- ${u.email} | ${u.name} | Role: ${u.role} | Semester: ${u.currentSemester} | DefaulterStatus: ${u.defaulterStatus} | Demands: ${demands.length}`);
    for (const d of demands) {
      console.log(`    Demand: sem ${d.semester}, status: ${d.status}, outstanding: ${d.outstandingAmount}, lateFee: ${d.lateFeeAccrued}, totalPaid: ${d.totalPaid}, dueDate: ${d.dueDate?.toISOString?.()?.split('T')[0]}`);
    }
  }

  const txns = await Transaction.find({}).sort({ createdAt: -1 }).limit(10).lean();
  console.log(`\nLast ${txns.length} transactions:`);
  for (const t of txns) {
    console.log(`- Txn: ${t._id} | Order: ${t.razorpayOrderId} | Status: ${t.status} | Amount: ${t.amount} | Demand: ${t.demand} | CapturedAt: ${t.capturedAt}`);
  }

  await mongoose.disconnect();
}

checkDb().catch(console.error);
