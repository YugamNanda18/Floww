import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import './models/index.js';
import User from './models/User.js';
import FeeDemand from './models/FeeDemand.js';
import Department from './models/Department.js';

async function generateTable() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ledgerx');
  const depts = await Department.find({}).sort({ code: 1 }).lean();
  
  for (const dept of depts) {
    console.log(`\n### Department: ${dept.name} (${dept.code})`);
    console.log('| Year | Semester | Student Name | Roll Number | Email ID | Password | Status Scenario | Total Demanded | Outstanding | Late Fee |');
    console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    
    const students = await User.find({ role: 'student', department: dept._id }).sort({ currentSemester: 1, rollNumber: 1 }).lean();
    for (const s of students) {
      const demand = await FeeDemand.findOne({ student: s._id }).lean();
      const yr = Math.ceil(s.currentSemester / 2);
      const statusDesc = demand.status === 'paid' ? 'Paid in Full (Clear)' : demand.status === 'overdue' ? 'Defaulter (Overdue)' : demand.status === 'partial' ? 'Scholarship / Flexi' : 'Pending (Fees Due)';
      console.log(`| Year ${yr} | Sem ${s.currentSemester} | ${s.name} | \`${s.rollNumber}\` | \`${s.email}\` | \`demo123\` | **${statusDesc}** | ₹${demand.totalDemanded/100} | ₹${demand.outstandingAmount/100} | ₹${demand.lateFeeAccrued/100} |`);
    }
  }
  await mongoose.disconnect();
}
generateTable();
