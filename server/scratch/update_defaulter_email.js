import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { syncStudentsToCsv } from '../utils/csvSync.js';

async function main() {
  await connectDB();

  // Update Rohit Gupta (the primary active defaulter) to user's real email address
  const rohit = await User.findOneAndUpdate(
    { rollNumber: 'CSE2303' },
    { $set: { email: 'yugamnanda12@gmail.com' } },
    { new: true }
  );

  console.log('✅ Defaulter Student CSE2303 email updated to:', rohit?.email);

  await syncStudentsToCsv();
  console.log('✅ CSV and Atlas synchronized with real delivery email!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
