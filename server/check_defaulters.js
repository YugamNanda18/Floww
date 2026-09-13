import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import './models/index.js';
import User from './models/User.js';
import FeeDemand from './models/FeeDemand.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx');
  const students = await User.find({ role: 'student' }).lean();
  console.log('Total students:', students.length);
  const defaulters = [];
  for (const s of students) {
    const overdue = await FeeDemand.find({
      student: s._id,
      $or: [
        { status: 'overdue' },
        { dueDate: { $lt: new Date() }, outstandingAmount: { $gt: 0 } }
      ]
    }).lean();
    if (overdue.length > 0) {
      defaulters.push({ student: s, overdue });
    }
  }
  console.log('Found defaulters count:', defaulters.length);
  for (const def of defaulters) {
    console.log(`Defaulter: ${def.student.email} (${def.student.name}) | Sem ${def.student.currentSemester} | Overdue demands: ${def.overdue.length}`);
    for (const d of def.overdue) {
      console.log(`   - Sem ${d.semester}: Status ${d.status}, Outstanding: ₹${d.outstandingAmount/100}, LateFee: ₹${d.lateFeeAccrued/100}, Due: ${d.dueDate?.toISOString?.()?.split('T')[0]}`);
    }
  }
  await mongoose.disconnect();
}
run();
