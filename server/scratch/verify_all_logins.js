import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

async function main() {
  await connectDB();

  async function testLogin(identifier, password) {
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { rollNumber: identifier.trim() },
        { employeeId: identifier.trim() },
      ],
    }).select('+passwordHash');

    if (!user) return { success: false, msg: 'User not found' };
    const match = await bcrypt.compare(password, user.passwordHash);
    return { success: match, role: user.role, name: user.name, identifier: user.rollNumber || user.employeeId };
  }

  const results = {
    adminById: await testLogin('ADM001', 'admin123'),
    adminByEmail: await testLogin('admin@demo.com', 'admin123'),
    superById: await testLogin('SUP001', 'admin123'),
    superByDemo: await testLogin('SUP001', 'demo123'),
    studentRoll: await testLogin('CSE2501', 'demo123'),
    studentEmail: await testLogin('student@demo.com', 'demo123'),
  };

  console.log('LOGIN_TEST_RESULTS:', JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
