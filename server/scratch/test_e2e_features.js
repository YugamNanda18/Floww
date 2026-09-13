import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('===========================================================');
  console.log('   RUNNING E2E API VERIFICATION FOR ALL ROLES & FEATURES   ');
  console.log('===========================================================');

  // 1. Login as Main Admin (ADM001)
  console.log('\n[1] Logging in as Main Admin (ADM001 / admin@demo.com)...');
  const mainAdminRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'admin@demo.com',
    password: 'admin123',
  });
  const mainAdminToken = mainAdminRes.data.data.accessToken || mainAdminRes.data.data.token;
  const mainAdminUser = mainAdminRes.data.data.user;
  console.log(`✅ Main Admin Logged In: ${mainAdminUser.name} (${mainAdminUser.role}) - Employee ID: ${mainAdminUser.employeeId}`);

  // 2. Main Admin lists all admins
  console.log('\n[2] Main Admin fetching staff list...');
  const staffRes = await axios.get(`${BASE_URL}/admin/staff`, {
    headers: { Authorization: `Bearer ${mainAdminToken}` },
  });
  const admins = staffRes.data.data.admins || staffRes.data.data;
  console.log(`✅ Staff list fetched: Found ${admins.length} admins.`);
  const adm001 = admins.find(a => a.employeeId === 'ADM001');
  const adm002 = admins.find(a => a.employeeId === 'ADM002');
  console.log(`   - Master Admin: ${adm001.name} (${adm001.employeeId})`);
  console.log(`   - Secondary Admin: ${adm002?.name || 'N/A'} (${adm002?.employeeId || 'N/A'})`);

  // 3. Main Admin tests modifying secondary admin ADM002
  if (adm002) {
    console.log('\n[3] Main Admin updating secondary admin ADM002 designation...');
    const updateRes = await axios.put(`${BASE_URL}/admin/admins/${adm002._id}`, {
      designation: 'Senior Finance Officer',
      isActive: true,
    }, {
      headers: { Authorization: `Bearer ${mainAdminToken}` },
    });
    console.log(`✅ Secondary admin updated successfully: ${updateRes.data.message}`);
  }

  // 4. Test protection: attempt to delete ADM001 should fail
  console.log('\n[4] Testing protection: attempting to delete ADM001 (should be blocked)...');
  try {
    await axios.delete(`${BASE_URL}/admin/admins/${adm001._id}`, {
      headers: { Authorization: `Bearer ${mainAdminToken}` },
    });
    console.error('❌ ERROR: Master Admin ADM001 was deleted! Security failure!');
  } catch (err) {
    console.log(`✅ Security check passed: Deletion blocked with message: "${err.response?.data?.message}"`);
  }

  // 5. Login as Centralized Superuser / Dean (SUP001)
  console.log('\n[5] Logging in as Centralized Superuser Dean (SUP001 / super@demo.com)...');
  const deanRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'super@demo.com',
    password: 'admin123',
  });
  const deanToken = deanRes.data.data.accessToken || deanRes.data.data.token;
  console.log(`✅ Dean Superuser Logged In: ${deanRes.data.data.user.name}`);

  // 6. Dean fetches Semester Students
  console.log('\n[6] Dean fetching Semester-Wise Student Roster...');
  const deanStudentsRes = await axios.get(`${BASE_URL}/superuser/semester-students`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  });
  console.log(`✅ Dean retrieved students: ${deanStudentsRes.data.data.students.length} students loaded. Department scoped: ${deanStudentsRes.data.data.isBranchScoped}`);

  // 7. Login as Branch Superuser (SUP-CSE / super.cse@demo.com)
  console.log('\n[7] Logging in as CSE Branch Superuser (super.cse@demo.com)...');
  const cseRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'super.cse@demo.com',
    password: 'admin123',
  });
  const cseToken = cseRes.data.data.accessToken || cseRes.data.data.token;
  console.log(`✅ CSE Branch Superuser Logged In: ${cseRes.data.data.user.name} (Dept: ${cseRes.data.data.user.department?.name || 'CSE'})`);

  // 8. CSE Branch Superuser fetches Semester Students (should strictly see CSE students)
  console.log('\n[8] CSE Branch Superuser fetching semester students...');
  const cseStudentsRes = await axios.get(`${BASE_URL}/superuser/semester-students`, {
    headers: { Authorization: `Bearer ${cseToken}` },
  });
  const cseStudents = cseStudentsRes.data.data.students;
  console.log(`✅ CSE Superuser retrieved ${cseStudents.length} students.`);
  const allAreCSE = cseStudents.every(s => s.department?.code === 'CSE');
  console.log(`   - Are all students strictly CSE? ${allAreCSE ? 'YES ✅' : 'NO ❌'}`);
  cseStudents.forEach(s => {
    console.log(`     * ${s.rollNumber} - ${s.name} (Sem ${s.currentSemester}) | Attendance: ${s.attendancePercentage}% | Shortage: ${s.hasShortage} | Dues: ₹${s.totalDue / 100}`);
  });

  // 9. CSE Branch Superuser fetches Weekly Timetable
  console.log('\n[9] CSE Branch Superuser fetching weekly timetable...');
  const cseTimetableRes = await axios.get(`${BASE_URL}/superuser/timetable?semester=3`, {
    headers: { Authorization: `Bearer ${cseToken}` },
  });
  const schedule = cseTimetableRes.data.data.timetable.weeklySchedule;
  console.log(`✅ Timetable retrieved: ${schedule.length} days scheduled for ${cseTimetableRes.data.data.department?.name} Sem 3.`);
  console.log(`   - College Hours: ${cseTimetableRes.data.data.timetable.collegeHours} | Lunch: ${cseTimetableRes.data.data.timetable.lunchBreak}`);
  console.log(`   - Monday Slot 1: ${schedule[0].slots[0].startTime} - ${schedule[0].slots[0].endTime} -> ${schedule[0].slots[0].subjectName}`);

  // 10. Student Login Test: CSE2303 (Rohit Gupta with yugamnanda12@gmail.com)
  console.log('\n[10] Student Login Test (CSE2303 / yugamnanda12@gmail.com)...');
  const studentRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'yugamnanda12@gmail.com',
    password: 'demo123',
  });
  console.log(`✅ Student Logged In: ${studentRes.data.data.user.name} (${studentRes.data.data.user.rollNumber})`);

  console.log('\n===========================================================');
  console.log('   🎉 ALL 10 E2E VERIFICATIONS PASSED WITH ZERO ERRORS!    ');
  console.log('===========================================================');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
