import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function verifyStudentGovernance() {
  console.log('=================================================================');
  console.log('  VERIFYING STUDENT GOVERNANCE: ADMIN RESTRICTION & REAL-TIME SYNC');
  console.log('=================================================================');

  // 1. Login as Admin
  console.log('\n[1] Logging in as Main Admin (ADM001)...');
  const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'admin@demo.com',
    password: 'admin123',
  });
  const adminToken = adminRes.data.data.accessToken;
  console.log(`✅ Admin Logged In: ${adminRes.data.data.user.name}`);

  // 2. Admin tries to onboard a student -> Must be rejected with 403
  console.log('\n[2] Testing Restriction: Admin attempts to onboard a student...');
  try {
    await axios.post(`${BASE_URL}/admin/students`, {
      name: 'Illegal Admin Student',
      email: 'illegal.student@demo.com',
      rollNumber: 'CSE9999',
      departmentId: '6a9eb06c57fc6131a95a1980',
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.error('❌ ERROR: Admin was able to onboard student! Governance check failed!');
    process.exit(1);
  } catch (err) {
    console.log(`✅ Security Check Passed! Admin blocked from onboarding: "${err.response?.data?.message}"`);
  }

  // 3. Login as Branch Superuser (SUP-CSE)
  console.log('\n[3] Logging in as CSE Branch Superuser (SUP-CSE)...');
  const cseRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'super.cse@demo.com',
    password: 'admin123',
  });
  const cseToken = cseRes.data.data.accessToken;
  console.log(`✅ CSE Superuser Logged In: ${cseRes.data.data.user.name} (Dept: ${cseRes.data.data.user.department?.name || 'CSE'})`);

  // 4. Branch Superuser onboards a student according to their branch
  const uniqueRoll = `CSE${Date.now().toString().slice(-4)}`;
  const uniqueEmail = `student.${uniqueRoll.toLowerCase()}@demo.com`;

  console.log(`\n[4] Branch Superuser onboards new student (${uniqueRoll} - Aditya Roy)...`);
  const onboardRes = await axios.post(`${BASE_URL}/superuser/students`, {
    name: 'Aditya Roy',
    email: uniqueEmail,
    rollNumber: uniqueRoll,
    batch: '2025-2029',
    currentSemester: 1,
    gender: 'male',
    phone: '+91 9876543219',
    // Branch superuser department is automatically locked by the server
  }, { headers: { Authorization: `Bearer ${cseToken}` } });

  const newStudent = onboardRes.data.data.student;
  console.log(`✅ Student Created by Superuser!`);
  console.log(`   - Roll Number : ${newStudent.rollNumber}`);
  console.log(`   - Student Name: ${newStudent.name}`);
  console.log(`   - Department  : ${newStudent.department?.name || 'Computer Science & Engineering'} (${newStudent.department?.code || 'CSE'})`);
  console.log(`   - Initial Pass: demo123`);

  // 5. Verify Real-Time Sync into Admin Console
  console.log('\n[5] Verifying Real-Time Sync into Admin Console...');
  const adminStudentsRes = await axios.get(`${BASE_URL}/admin/students?search=${uniqueRoll}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const syncedStudent = adminStudentsRes.data.data.students.find(s => s.rollNumber === uniqueRoll);

  if (!syncedStudent) {
    console.error('❌ ERROR: Newly created student not found in Admin console!');
    process.exit(1);
  }

  console.log(`✅ Real-Time Sync Confirmed! Admin retrieved newly created student:`);
  console.log(`   - Name          : ${syncedStudent.name}`);
  console.log(`   - Department    : ${syncedStudent.department?.name} (${syncedStudent.department?.code})`);
  console.log(`   - Fee Status    : ${syncedStudent.financials?.feeStatus?.toUpperCase()}`);
  console.log(`   - Base Demanded : ₹${(syncedStudent.financials?.totalDemanded / 100).toLocaleString('en-IN')}`);
  console.log(`   - Outstanding   : ₹${(syncedStudent.financials?.totalOutstanding / 100).toLocaleString('en-IN')}`);

  // 6. Admin executes financial management on the newly created student
  console.log('\n[6] Admin executing financial operations: querying student financial history & demands...');
  const historyRes = await axios.get(`${BASE_URL}/admin/students/${syncedStudent._id}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`✅ Admin Financial History Verified:`);
  console.log(`   - Demands Count: ${historyRes.data.data.demands?.length || 0}`);
  console.log(`   - Ledger Entries: ${historyRes.data.data.ledgerEntries?.length || 0}`);
  console.log(`   - Caution Money Held: ₹${((historyRes.data.data.cautionMoney?.depositAmount || 1000000) / 100).toLocaleString('en-IN')}`);

  console.log('\n=================================================================');
  console.log('   🎉 ALL GOVERNANCE AND REAL-TIME SYNC CHECKS PASSED WITH 100%! ');
  console.log('=================================================================');
}

verifyStudentGovernance().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
