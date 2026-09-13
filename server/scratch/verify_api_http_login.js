const testHttpLogin = async () => {
  console.log('--- Testing Live HTTP API Login on http://localhost:5000/api/auth/login ---\n');

  const credentials = [
    { role: 'Student (ME2301)', identifier: 'ME2301', password: 'demo123' },
    { role: 'Student (cse2501)', identifier: 'cse2501', password: 'demo123' },
    { role: 'Admin (ADM001)', identifier: 'ADM001', password: 'admin123' },
    { role: 'Admin (adm001)', identifier: 'adm001', password: 'admin123' },
    { role: 'Superuser (SUP001)', identifier: 'SUP001', password: 'admin123' },
    { role: 'Superuser (sup001)', identifier: 'sup001', password: 'admin123' },
  ];

  for (const c of credentials) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: c.identifier, password: c.password }),
      });

      const json = await res.json();

      if (res.status === 200 && json.success) {
        console.log(`✅ [HTTP 200 SUCCESS] ${c.role.padEnd(25)} -> Logged in as: ${json.data.user.name} (${json.data.user.role})`);
      } else {
        console.log(`❌ [HTTP ${res.status} FAILED] ${c.role.padEnd(25)} -> Message: ${json.message}`);
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${c.role.padEnd(25)} -> ${err.message}`);
    }
  }

  console.log('\n--- Live HTTP API Login Verification Complete ---');
  process.exit(0);
};

testHttpLogin();
