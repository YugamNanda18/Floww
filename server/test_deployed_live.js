// Test live deployed services
const API_URL = 'https://floww-api.onrender.com/api';
const CLIENT_URL = 'https://floww-gamma-gilt.vercel.app';

async function runTest() {
  console.log('=== FLOWW LIVE PRODUCTION DEPLOYMENT TEST ===\n');

  // 1. Health Ping
  console.log('1. Pinging Live Backend Health...');
  const healthRes = await fetch(`${API_URL}/health`);
  console.log('   Health Status:', healthRes.status, await healthRes.json());

  // 2. Test Superuser Login
  console.log('\n2. Testing Live Superuser (Dean) Login...');
  const deanRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'super@demo.com', password: 'admin123' }),
  });
  const deanData = await deanRes.json();
  console.log('   Dean Login Status:', deanRes.status, 'Success:', deanData.success, 'User:', deanData.data?.user?.name, 'Role:', deanData.data?.user?.role);
  const token = deanData.data?.accessToken;

  // 3. Test Admin / Staff Demands & Analytics
  if (token) {
    console.log('\n3. Testing Superuser Analytics API...');
    const analyticsRes = await fetch(`${API_URL}/superuser/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('   Analytics Status:', analyticsRes.status);

    console.log('\n4. Testing Students Fetch API...');
    const studentsRes = await fetch(`${API_URL}/admin/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const studentsData = await studentsRes.json();
    console.log('   Students Status:', studentsRes.status, 'Total Students:', studentsData.data?.length || studentsData.length || 0);
  }

  // 4. Test Student Login (Defaulter & Active)
  console.log('\n5. Testing Live Student Login (Geeta Bhat)...');
  const studentRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'geeta@demo.com', password: 'demo123' }),
  });
  const studentData = await studentRes.json();
  console.log('   Student Login Status:', studentRes.status, 'Success:', studentData.success, 'Roll:', studentData.data?.user?.rollNumber, 'isDefaulter:', studentData.data?.user?.isDefaulter);

  // 5. Test Frontend HTML & Redirection Routes
  console.log('\n6. Testing Deployed Frontend Pages...');
  const pages = ['/', '/login', '/student/dashboard', '/admin/ledger'];
  for (const page of pages) {
    const pRes = await fetch(`${CLIENT_URL}${page}`);
    console.log(`   GET ${CLIENT_URL}${page} -> HTTP ${pRes.status}`);
  }

  console.log('\n=== ALL LIVE DEPLOYED SMOKE TESTS COMPLETED ===');
}

runTest().catch(console.error);
