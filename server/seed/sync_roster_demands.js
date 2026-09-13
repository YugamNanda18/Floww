import mongoose from 'mongoose';
import '../models/index.js';
import User from '../models/User.js';
import FeeDemand from '../models/FeeDemand.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  // Paid students: student@demo.com, ece.paid@demo.com, me.paid@demo.com, ce.paid@demo.com
  // Ensure each paid student has ONLY paid demands with 0 outstanding!
  const paidEmails = ['student@demo.com', 'ece.paid@demo.com', 'me.paid@demo.com', 'ce.paid@demo.com'];
  for (const email of paidEmails) {
    const user = await User.findOne({ email });
    if (user) {
      // Remove any extra bulk demands created during testing
      const demands = await FeeDemand.find({ student: user._id });
      if (demands.length > 1) {
        // Keep the first demand, remove others
        for (let i = 1; i < demands.length; i++) {
          await FeeDemand.findByIdAndDelete(demands[i]._id);
        }
      }
      const primary = await FeeDemand.findOne({ student: user._id });
      if (primary) {
        primary.status = 'paid';
        primary.totalPaid = primary.totalDemanded;
        primary.outstandingAmount = 0;
        primary.lateFeeAccrued = 0;
        await primary.save();
      }
    }
  }

  // Pending students: cse.pending@demo.com, ece.pending@demo.com, me.pending@demo.com, ce.pending@demo.com
  // Due date in the future (30 days ahead) so they are NOT defaulters, but have pending fees
  const pendingEmails = ['cse.pending@demo.com', 'ece.pending@demo.com', 'me.pending@demo.com', 'ce.pending@demo.com'];
  const futureDue = new Date();
  futureDue.setDate(futureDue.getDate() + 30);

  for (const email of pendingEmails) {
    const user = await User.findOne({ email });
    if (user) {
      const demands = await FeeDemand.find({ student: user._id });
      if (demands.length > 1) {
        for (let i = 1; i < demands.length; i++) {
          await FeeDemand.findByIdAndDelete(demands[i]._id);
        }
      }
      const primary = await FeeDemand.findOne({ student: user._id });
      if (primary) {
        primary.status = 'pending';
        primary.dueDate = futureDue;
        primary.lateFeeAccrued = 0;
        await primary.save();
      }
    }
  }

  // Defaulter students: rohit@demo.com, karan@demo.com, sanjay@demo.com, geeta@demo.com
  // Due date in past, status overdue
  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 45);
  const defaulterEmails = ['rohit@demo.com', 'karan@demo.com', 'sanjay@demo.com', 'geeta@demo.com'];

  for (const email of defaulterEmails) {
    const user = await User.findOne({ email });
    if (user) {
      const demands = await FeeDemand.find({ student: user._id });
      if (demands.length > 1) {
        for (let i = 1; i < demands.length; i++) {
          await FeeDemand.findByIdAndDelete(demands[i]._id);
        }
      }
      const primary = await FeeDemand.findOne({ student: user._id });
      if (primary) {
        primary.status = 'overdue';
        primary.dueDate = pastDue;
        primary.lateFeeAccrued = 150000; // ₹1,500
        await primary.save();
      }
    }
  }

  console.log('Roster statuses strictly synchronized: 4 Paid (All Clear), 4 Pending (Ready to pay), 4 Defaulters (Overdue hold).');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
