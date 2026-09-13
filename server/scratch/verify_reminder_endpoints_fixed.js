const verifyReminders = async () => {
  console.log('--- Testing Real-Time Reminder HTTP API Endpoints ---\n');

  // 1. First login as Admin to get Token
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ADM001', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.accessToken;
  console.log(`🔑 Logged in as Admin: ${loginJson.data.user.name}`);

  // 2. Test Mass Reminders endpoint
  const massRes = await fetch('http://localhost:5000/api/admin/reminders/send-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const massJson = await massRes.json();
  console.log(`\n📧 [MASS REMINDERS HTTP ${massRes.status}]`);
  console.log(`   Message: ${massJson.message}`);
  console.log(`   Total Notified: ${massJson.data?.totalStudentsNotified}`);

  // 3. Test Individual Student Reminder endpoint (student with dues e.g. CSE2502)
  const studentsRes = await fetch('http://localhost:5000/api/admin/students', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const studentsJson = await studentsRes.json();
  const studentWithDues = studentsJson.data.students.find(s => s.financials?.totalOutstanding > 0);

  if (studentWithDues) {
    const indivRes = await fetch(`http://localhost:5000/api/admin/reminders/send-student/${studentWithDues._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const indivJson = await indivRes.json();
    console.log(`\n📧 [INDIVIDUAL REMINDER HTTP ${indivRes.status}]`);
    console.log(`   Student: ${studentWithDues.name} (${studentWithDues.rollNumber})`);
    console.log(`   Message: ${indivJson.message}`);
  }

  console.log('\n--- Verification Complete ---');
  process.exit(0);
};

verifyReminders();
