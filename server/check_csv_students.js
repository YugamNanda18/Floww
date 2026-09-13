import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

await mongoose.connect('mongodb://localhost:27017/ledgerx');
const db = mongoose.connection.db;
const usersCol = db.collection('users');

const csvPath = 'c:/Users/Acer/OneDrive/Desktop/Legderx/students_manual_test_roster.csv';
const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');

console.log('--- Verifying DB users against CSV ---');
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split(',');
  const rollNumber = row[5]?.trim();
  const name = row[6]?.trim();
  
  if (!rollNumber) continue;

  const found = await usersCol.findOne({ rollNumber });
  if (found) {
    console.log(`✅ [FOUND] Roll: ${rollNumber} | Name: ${found.name} | Role: ${found.role}`);
  } else {
    console.log(`❌ [MISSING] Roll: ${rollNumber} | Name: ${name}`);
  }
}

await mongoose.disconnect();
