import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/ledgerx');
const col = mongoose.connection.db.collection('users');

// Get all students with their roll numbers
const students = await col.find({ role: 'student' }, 
  { projection: { name: 1, email: 1, rollNumber: 1, department: 1 } })
  .sort({ rollNumber: 1 }).toArray();

console.log('All students (roll -> email):');
students.forEach(u => console.log(`  ${u.rollNumber?.padEnd(12)} -> ${u.email}`));

await mongoose.disconnect();
