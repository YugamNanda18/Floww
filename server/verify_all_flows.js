const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data || {});
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('--- 1. Login as Admin ---');
  let adminRes = await post('http://localhost:5000/api/auth/login', { email: 'admin@demo.com', password: 'password123' });
  let adminToken = adminRes.body?.data?.token;
  if (!adminToken) {
    adminRes = await post('http://localhost:5000/api/auth/login', { email: 'admin@demo.com', password: 'demo123' });
    adminToken = adminRes.body?.data?.token;
  }
  console.log('Admin login status:', adminRes.status, 'Token exists:', !!adminToken);

  console.log('\n--- 2. Test Admin Demands for student dropdown (/admin/demands?studentId=...) ---');
  const studentsRes = await get('http://localhost:5000/api/admin/students', adminToken);
  const students = studentsRes.body?.data?.students || studentsRes.body?.data || [];
  console.log('Found students count:', students.length);
  if (students.length > 0) {
    const sampleStudent = students[0];
    const sId = sampleStudent._id;
    console.log('Fetching demands for student:', sampleStudent.fullName, sId);
    const demandsRes = await get('http://localhost:5000/api/admin/demands?studentId=' + sId, adminToken);
    console.log('Demands API status:', demandsRes.status, 'demands count:', demandsRes.body?.data?.demands?.length);
  }

  console.log('\n--- 3. Login as Superuser & test bulk demands and scholarships data ---');
  let superRes = await post('http://localhost:5000/api/auth/login', { email: 'super@demo.com', password: 'password123' });
  let superToken = superRes.body?.data?.token;
  if (!superToken) {
    superRes = await post('http://localhost:5000/api/auth/login', { email: 'super@demo.com', password: 'demo123' });
    superToken = superRes.body?.data?.token;
  }
  console.log('Superuser login status:', superRes.status, 'Token exists:', !!superToken);

  const adminDemandsForScholarship = await get('http://localhost:5000/api/admin/demands', superToken);
  console.log('Admin demands for scholarships fetched:', adminDemandsForScholarship.status, 'count:', adminDemandsForScholarship.body?.data?.demands?.length);

  console.log('\n--- 4. Check Defaulter Students & Demands ---');
  for (const email of ['rohit@demo.com', 'karan@demo.com', 'sanjay@demo.com', 'geeta@demo.com']) {
    let sLogin = await post('http://localhost:5000/api/auth/login', { email, password: 'password123' });
    if (!sLogin.body?.data?.token) sLogin = await post('http://localhost:5000/api/auth/login', { email, password: 'demo123' });
    const sToken = sLogin.body?.data?.token;
    const user = sLogin.body?.data?.user;
    if (sToken) {
      const dRes = await get('http://localhost:5000/api/student/demands', sToken);
      const demands = dRes.body?.data || [];
      const outstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0) + (d.lateFeeAccrued || 0), 0);
      console.log('Student: ' + email + ' | Name: ' + user.fullName + ' | DefaulterStatus: ' + user.defaulterStatus + ' | Total Dues: Rs.' + outstanding);
    } else {
      console.log('Student ' + email + ' login failed');
    }
  }
}

test().catch(console.error);
