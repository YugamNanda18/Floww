const testEndpoints = async () => {
  console.log('--- Testing Real-Time Due Reminder Endpoint Responses ---\n');

  // Test Mass Reminders
  try {
    const massRes = await fetch('http://localhost:5000/api/admin/reminders/send-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const massJson = await massRes.json();
    console.log(`[MASS REMINDERS HTTP ${massRes.status}] -> ${massJson.message}`);
  } catch (e) {
    console.log('Mass Error:', e.message);
  }

  console.log('\n--- Endpoint Response Check Complete ---');
  process.exit(0);
};

testEndpoints();
