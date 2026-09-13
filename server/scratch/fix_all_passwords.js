import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const fixAllPasswords = async () => {
  await connectDB();
  console.log('--- Inspecting and Fixing All User Credentials permanently ---');

  const users = await User.find().select('+passwordHash');
  console.log(`Found ${users.length} total users in database.`);

  const studentHash = await bcrypt.hash('demo123', 12);
  const staffHash = await bcrypt.hash('admin123', 12);

  let updatedCount = 0;

  for (const u of users) {
    let newHash = u.role === 'student' ? studentHash : staffHash;
    
    // Ensure rollNumber or employeeId are properly formatted
    if (u.role === 'student' && u.rollNumber) {
      u.rollNumber = u.rollNumber.trim().toUpperCase();
    }
    if ((u.role === 'admin' || u.role === 'superuser') && u.employeeId) {
      u.employeeId = u.employeeId.trim().toUpperCase();
    }

    u.passwordHash = newHash;
    u.isActive = true;
    await u.save();
    updatedCount++;
    console.log(`[FIXED] Role: ${u.role.padEnd(10)} | ID: ${(u.rollNumber || u.employeeId || 'N/A').padEnd(10)} | Email: ${u.email.padEnd(30)} | Password set to: ${u.role === 'student' ? 'demo123' : 'admin123'}`);
  }

  console.log(`\n✅ Permanently updated ${updatedCount} users with verified bcrypt hashes and active status!`);
  process.exit(0);
};

fixAllPasswords().catch((err) => {
  console.error('Error fixing passwords:', err);
  process.exit(1);
});
