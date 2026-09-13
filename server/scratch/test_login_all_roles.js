import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const testLogin = async () => {
  await connectDB();
  console.log('--- Testing Login Authentication for All Roles ---\n');

  const testCases = [
    { role: 'Admin', id: 'ADM001', pass: 'admin123' },
    { role: 'Admin (lowercase)', id: 'adm001', pass: 'admin123' },
    { role: 'Admin Email', id: 'admin@demo.com', pass: 'admin123' },
    { role: 'Superuser', id: 'SUP001', pass: 'admin123' },
    { role: 'Superuser (lowercase)', id: 'sup001', pass: 'admin123' },
    { role: 'Superuser Email', id: 'super@demo.com', pass: 'admin123' },
    { role: 'Student 1', id: 'CSE2501', pass: 'demo123' },
    { role: 'Student 1 (lowercase)', id: 'cse2501', pass: 'demo123' },
    { role: 'Student 1 Email', id: 'student@demo.com', pass: 'demo123' },
    { role: 'Student 2', id: 'ECE2401', pass: 'demo123' },
    { role: 'Student 2 (lowercase)', id: 'ece2401', pass: 'demo123' },
  ];

  for (const tc of testCases) {
    const escaped = tc.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const idRegex = new RegExp(`^${escaped}$`, 'i');

    const user = await User.findOne({
      $or: [
        { rollNumber: idRegex },
        { employeeId: idRegex },
        { email: idRegex },
      ],
    }).select('+passwordHash');

    if (!user) {
      console.log(`❌ [FAILED] ${tc.role}: User with ID '${tc.id}' not found.`);
      continue;
    }

    const isValid = await user.comparePassword(tc.pass);
    if (isValid) {
      console.log(`✅ [SUCCESS] ${tc.role.padEnd(22)} | ID: ${tc.id.padEnd(18)} | Found: ${user.name} (${user.role})`);
    } else {
      console.log(`❌ [FAILED] ${tc.role.padEnd(22)} | ID: ${tc.id.padEnd(18)} | Password mismatch!`);
    }
  }

  console.log('\n--- Test Completed ---');
  process.exit(0);
};

testLogin().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
