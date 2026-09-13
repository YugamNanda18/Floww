import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb://localhost:27017/ledgerx');
const col = mongoose.connection.db.collection('users');

const passwordHash = await bcrypt.hash('admin123', 10);

// Upsert Admin
await col.updateOne(
  { email: 'admin@demo.com' },
  {
    $set: {
      name: 'Rajesh Kumar (Admin)',
      email: 'admin@demo.com',
      employeeId: 'ADM001',
      passwordHash,
      role: 'admin',
      isActive: true,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      createdAt: new Date(),
    }
  },
  { upsert: true }
);

// Upsert Superuser
await col.updateOne(
  { email: 'super@demo.com' },
  {
    $set: {
      name: 'Dr. Sita Rao (Superuser)',
      email: 'super@demo.com',
      employeeId: 'SUP001',
      passwordHash,
      role: 'superuser',
      isActive: true,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      createdAt: new Date(),
    }
  },
  { upsert: true }
);

console.log('✅ Admin (ADM001) and Superuser (SUP001) seeded/updated with password: admin123');

await mongoose.disconnect();
