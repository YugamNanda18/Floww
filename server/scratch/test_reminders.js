import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { sendMassRealtimeFeeReminders } from '../services/notification.service.js';

const run = async () => {
  await connectDB();
  console.log('Sending real-time fee due reminders to all students with outstanding balances...\n');
  const result = await sendMassRealtimeFeeReminders();
  console.log('\n--- Mass Real-time Fee Reminders Summary ---');
  console.log(`Total Students Notified: ${result.totalStudentsNotified}`);
  process.exit(0);
};

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
