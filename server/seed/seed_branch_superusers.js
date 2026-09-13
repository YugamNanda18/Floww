import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import bcrypt from 'bcryptjs';

async function main() {
  await connectDB();

  const depts = await Department.find({});
  console.log('Found departments:', depts.map((d) => ({ code: d.code, name: d.name, id: d._id })));

  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Ensure Master Superuser (Institutional — All Departments)
  await User.findOneAndUpdate(
    { email: 'super@demo.com' },
    {
      $set: {
        name: 'Dr. Sita Rao (Master Superuser)',
        employeeId: 'SUP001',
        role: 'superuser',
        department: null,
        passwordHash,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log('✅ Master Superuser configured: SUP001 (super@demo.com)');

  // 2. Ensure Master Admin (Institutional — All Departments)
  await User.findOneAndUpdate(
    { email: 'admin@demo.com' },
    {
      $set: {
        name: 'Rajesh Kumar (Finance Admin)',
        employeeId: 'ADM001',
        role: 'admin',
        department: null,
        passwordHash,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log('✅ Master Finance Admin configured: ADM001 (admin@demo.com)');

  // 3. Create Department-Specific Superusers
  const branchSuperusers = [
    { code: 'CSE', name: 'Prof. Arvind Menon (CSE Superuser)', email: 'super.cse@demo.com', id: 'SUP-CSE' },
    { code: 'ECE', name: 'Dr. Radhika Iyer (ECE Superuser)', email: 'super.ece@demo.com', id: 'SUP-ECE' },
    { code: 'ME', name: 'Prof. Vikram Chauhan (ME Superuser)', email: 'super.me@demo.com', id: 'SUP-ME' },
    { code: 'CE', name: 'Dr. Sunita Sharma (CE Superuser)', email: 'super.ce@demo.com', id: 'SUP-CE' },
  ];

  for (const bs of branchSuperusers) {
    const dept = depts.find((d) => d.code === bs.code);
    if (dept) {
      await User.findOneAndUpdate(
        { email: bs.email },
        {
          $set: {
            name: bs.name,
            employeeId: bs.id,
            role: 'superuser',
            department: dept._id,
            passwordHash,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Created/Updated Branch Superuser: ${bs.id} (${bs.email}) for ${dept.name} (${dept.code})`);
    }
  }

  console.log('\n🎉 ALL STAFF & BRANCH SUPERUSERS CONFIGURED WITH PASSWORD: admin123\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
