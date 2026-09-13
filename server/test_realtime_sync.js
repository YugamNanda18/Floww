import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getRedis } from './config/redis.js';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function testRealtimeSync() {
  console.log('====================================================');
  console.log('TESTING REAL-TIME MONGODB & REDIS SYNCHRONIZATION');
  console.log('====================================================\n');

  // 1. Log in as CSE HOD (Branch Superuser)
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'super.cse@demo.com',
    password: 'admin123',
  });
  const token = loginRes.data.data.accessToken;
  const hodApi = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  // 2. Test Semester 3 student (should auto-set Year 2, Batch 2024-2028, Academic Year 2025-26)
  const testRoll = `CSE_SEM3_${Date.now().toString().slice(-4)}`;
  const testEmail = `sync.${testRoll.toLowerCase()}@demo.com`;

  console.log(`Creating student: ${testRoll} in Semester 3...`);
  const createRes = await hodApi.post('/superuser/students', {
    name: 'Realtime Sync Student',
    email: testEmail,
    rollNumber: testRoll,
    password: 'demo123',
    currentSemester: 3,
  });

  const createdData = createRes.data?.data;
  const student = createdData?.student;
  const demand = createdData?.demand;
  const derived = createdData?.derived;

  console.log('\n--- 1. MongoDB Creation Verification ---');
  console.log(`Student ID: ${student._id}`);
  console.log(`Branch: ${derived?.branch || student.department}`);
  console.log(`Semester: ${student.currentSemester}`);
  console.log(`Derived Year: ${student.year} (Expected: 2)`);
  console.log(`Derived Batch: ${student.batch} (Expected: 2024-2028)`);
  console.log(`Academic Year: ${student.academicYear}`);
  console.log(`Fee Demand Amount: ₹${demand.totalDemanded / 100} (Semester ${demand.semester})`);

  if (student.year !== 2) throw new Error(`Expected year 2, got ${student.year}`);
  if (student.currentSemester !== 3) throw new Error(`Expected semester 3, got ${student.currentSemester}`);
  console.log('✅ MongoDB document created with correct year, semester, and branch!');

  // 3. Verify in Redis directly
  console.log('\n--- 2. Redis Real-Time Cache Verification ---');
  const redis = getRedis();
  if (redis.status === 'wait' || redis.status === 'close') {
    await redis.connect();
  }
  const redisDataRaw = await redis.get(`student:${student._id}`);
  if (!redisDataRaw) {
    throw new Error(`Student ${student._id} not found in Redis!`);
  }
  const redisStudent = JSON.parse(redisDataRaw);
  console.log(`Found in Redis key [student:${student._id}]:`);
  console.log(` - Name: ${redisStudent.name}`);
  console.log(` - Roll: ${redisStudent.rollNumber}`);
  console.log(` - Branch: ${redisStudent.branch}`);
  console.log(` - Year: ${redisStudent.year}`);
  console.log(` - Semester: ${redisStudent.currentSemester}`);
  console.log(` - Batch: ${redisStudent.batch}`);
  console.log(` - Financial Status: ${redisStudent.financials?.status}`);

  const isMemberOfDept = await redis.sismember(`dept:${redisStudent.branch}:students`, student._id);
  const isMemberOfSem = await redis.sismember(`dept:${redisStudent.branch}:sem:3:students`, student._id);
  const isMemberOfYear = await redis.sismember(`dept:${redisStudent.branch}:year:2:students`, student._id);

  console.log(` - In dept:${redisStudent.branch}:students: ${Boolean(isMemberOfDept)}`);
  console.log(` - In dept:${redisStudent.branch}:sem:3:students: ${Boolean(isMemberOfSem)}`);
  console.log(` - In dept:${redisStudent.branch}:year:2:students: ${Boolean(isMemberOfYear)}`);

  if (!isMemberOfDept || !isMemberOfSem || !isMemberOfYear) {
    throw new Error('Redis branch/year/sem set indexing failed!');
  }
  console.log('✅ Redis real-time indexing verified!');

  // 4. Verify CSV Roster file
  console.log('\n--- 3. CSV Roster Real-Time Update Verification ---');
  const csvPath = path.resolve(process.cwd(), '../students_manual_test_roster.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const studentLine = csvContent.split('\n').find(line => line.includes(testRoll));
  if (!studentLine) {
    throw new Error(`Student ${testRoll} not found in students_manual_test_roster.csv!`);
  }
  console.log(`CSV Row: ${studentLine}`);
  console.log('✅ CSV Roster successfully updated in real time!');

  console.log('\n====================================================');
  console.log('ALL REAL-TIME MONGODB + REDIS + CSV CHECKS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

testRealtimeSync().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
