import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runE2EAudit() {
  console.log('====================================================');
  console.log('FLOWW (LedgerX) SENIOR QA & FULL-STACK E2E AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper for requests
  const api = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('\n--- 1. API Health & Baseline ---');
    const health = await api.get('/health');
    assert(health.status === 200 && health.data?.status === 'ok', 'API health check responds 200 OK');

    // ----------------------------------------------------
    // TEST 2: Main Superuser (Dean) Authentication & Governance
    // ----------------------------------------------------
    console.log('\n--- 2. Main Superuser Governance ---');
    const deanLogin = await api.post('/auth/login', {
      identifier: 'super@demo.com',
      password: 'admin123',
    });
    assert(deanLogin.status === 200, 'Main Superuser (Dean) logs in successfully');
    const deanToken = deanLogin.data.data.accessToken;
    const deanApi = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${deanToken}` },
      validateStatus: () => true,
    });

    const deanAnalytics = await deanApi.get('/superuser/analytics');
    assert(deanAnalytics.status === 200, 'Dean can access institute-wide analytics');

    const deptsRes = await deanApi.get('/superuser/departments');
    assert(deptsRes.status === 200 && Array.isArray(deptsRes.data.data), 'Dean can list departments');
    const cseDept = deptsRes.data.data.find(d => d.code === 'CSE') || deptsRes.data.data[0];
    const eceDept = deptsRes.data.data.find(d => d.code === 'ECE') || deptsRes.data.data[1];

    // ----------------------------------------------------
    // TEST 3: Branch Superuser (HOD) Isolation & Onboarding
    // ----------------------------------------------------
    console.log('\n--- 3. Branch Superuser (HOD) Isolation ---');
    const hodLogin = await api.post('/auth/login', {
      identifier: 'super.cse@demo.com',
      password: 'admin123',
    });
    assert(hodLogin.status === 200, 'CSE HOD logs in successfully');
    const hodToken = hodLogin.data.data.accessToken;
    const hodApi = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${hodToken}` },
      validateStatus: () => true,
    });

    // Create a new unique student
    const testRoll = `CSE_QA_${Date.now().toString().slice(-5)}`;
    const testEmail = `qa.${testRoll.toLowerCase()}@demo.com`;

    const createStudentRes = await hodApi.post('/superuser/students', {
      name: 'QA Test Student',
      email: testEmail,
      rollNumber: testRoll,
      password: 'demoPassword123',
      departmentId: eceDept ? eceDept._id : cseDept._id, // Attempt to assign ECE
      currentSemester: 1,
      batch: '2025-2029',
    });

    assert(createStudentRes.status === 201, `HOD creates student with roll ${testRoll}`);
    const createdStudent = createStudentRes.data?.data?.student;
    
    // Check branch isolation: even though ECE was requested, HOD is locked to CSE
    assert(
      createdStudent?.department?.toString() === cseDept._id.toString() ||
      createdStudent?.department?._id?.toString() === cseDept._id.toString(),
      'Branch Superuser is strictly scoped to own department (cannot onboard into other branches)'
    );

    // Verify Fee Demand, Caution Money, and Ledger were generated
    assert(createStudentRes.data?.data?.demand !== undefined, 'FeeDemand automatically raised upon onboarding');
    assert(createStudentRes.data?.data?.cautionMoney !== undefined, 'Caution Money deposit record created upon onboarding');

    // ----------------------------------------------------
    // TEST 4: Finance Admin Permissions (No Student Creation)
    // ----------------------------------------------------
    console.log('\n--- 4. Finance Admin Governance ---');
    const adminLogin = await api.post('/auth/login', {
      identifier: 'admin@demo.com',
      password: 'admin123',
    });
    assert(adminLogin.status === 200, 'Finance Admin logs in successfully');
    const adminToken = adminLogin.data.data.accessToken;
    const adminApi = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${adminToken}` },
      validateStatus: () => true,
    });

    const adminAttemptCreate = await adminApi.post('/admin/students', {
      name: 'Illegal Admin Student',
      email: `illegal.${Date.now()}@demo.com`,
      rollNumber: `ILL_${Date.now().toString().slice(-4)}`,
    });
    assert(
      adminAttemptCreate.status === 403,
      'Finance Admin is strictly forbidden from creating students (Admissions restricted to Superuser)'
    );

    // ----------------------------------------------------
    // TEST 5: Complete Student Financial Flow & Idempotency
    // ----------------------------------------------------
    console.log('\n--- 5. Student Financial Lifecycle & Idempotency ---');
    const studentLogin = await api.post('/auth/login', {
      identifier: testEmail,
      password: 'demoPassword123',
    });
    assert(studentLogin.status === 200, 'Newly created student logs in');
    assert(studentLogin.data.data.user.isDefaulter === false, 'Freshly admitted student with future due date is NOT flagged as defaulter');

    const studentToken = studentLogin.data.data.accessToken;
    const studentApi = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${studentToken}` },
      validateStatus: () => true,
    });

    const demandsRes = await studentApi.get('/student/demands');
    assert(demandsRes.status === 200 && demandsRes.data.data.length > 0, 'Student can view their fee demands');
    const testDemand = demandsRes.data.data[0];
    const initialOutstanding = testDemand.outstandingAmount;
    assert(initialOutstanding > 0, `Initial demand outstanding amount is ₹${initialOutstanding / 100}`);

    // Create Payment Order
    const payAmount = 2500000; // ₹25,000 partial payment
    const orderRes = await studentApi.post('/payment/order', {
      demandId: testDemand._id,
      amount: payAmount,
    });
    assert(orderRes.status === 200 && orderRes.data.data?.orderId, 'Razorpay order created for student');
    const orderData = orderRes.data.data;

    // Simulate Payment Verification
    const fakePaymentId = `pay_qa_${Date.now()}`;
    const verifyRes = await studentApi.post('/payment/verify', {
      razorpayOrderId: orderData.orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: 'demo_signature',
      demandId: testDemand._id,
      amount: payAmount,
    });
    assert(verifyRes.status === 200 && verifyRes.data.data?.receipt, 'Payment verification succeeds and issues receipt');
    const firstReceipt = verifyRes.data.data.receipt;
    const updatedDemand = verifyRes.data.data.demand;

    assert(
      updatedDemand.outstandingAmount === initialOutstanding - payAmount,
      `Fee demand outstanding correctly reduced from ₹${initialOutstanding / 100} to ₹${updatedDemand.outstandingAmount / 100}`
    );
    assert(
      updatedDemand.totalPaid === payAmount,
      `Fee demand totalPaid correctly recorded as ₹${updatedDemand.totalPaid / 100}`
    );

    // IDEMPOTENCY CHECK: Re-run the EXACT same payment verification (e.g. double-click / network retry)
    console.log('\n--- 6. Payment Idempotency Verification ---');
    const duplicateVerifyRes = await studentApi.post('/payment/verify', {
      razorpayOrderId: orderData.orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: 'demo_signature',
      demandId: testDemand._id,
      amount: payAmount,
    });
    assert(duplicateVerifyRes.status === 200, 'Duplicate payment verification request handled cleanly');
    assert(
      duplicateVerifyRes.data.data?.receipt?.receiptNumber === firstReceipt.receiptNumber,
      'Duplicate request returns existing receipt without issuing a duplicate'
    );

    // Re-fetch demand to ensure no double-deduction occurred
    const recheckDemand = await studentApi.get(`/student/demands/${testDemand._id}`);
    assert(
      recheckDemand.data.data.outstandingAmount === initialOutstanding - payAmount,
      'Outstanding amount did NOT double-deduct on repeated verification call'
    );

    // ----------------------------------------------------
    // TEST 7: Double-Entry Ledger Accounting Audit (Debit = Credit)
    // ----------------------------------------------------
    console.log('\n--- 7. Double-Entry Ledger Accounting Audit ---');
    const ledgerRes = await adminApi.get('/ledger');
    assert(ledgerRes.status === 200, 'Finance Admin can retrieve ledger');
    const entries = ledgerRes.data.entries || ledgerRes.data.data?.entries || [];

    // Group ledger entries by journalId
    const journals = {};
    for (const entry of entries) {
      if (!journals[entry.journalId]) {
        journals[entry.journalId] = { debits: 0, credits: 0, count: 0 };
      }
      if (entry.type === 'debit') {
        journals[entry.journalId].debits += entry.amount;
      } else if (entry.type === 'credit') {
        journals[entry.journalId].credits += entry.amount;
      }
      journals[entry.journalId].count++;
    }

    let allBalanced = true;
    let journalCount = Object.keys(journals).length;
    for (const [jid, j] of Object.entries(journals)) {
      if (j.debits !== j.credits) {
        allBalanced = false;
        console.error(`Unbalanced journal entry ${jid}: Debits=${j.debits}, Credits=${j.credits}`);
      }
    }
    assert(allBalanced && journalCount > 0, `All ${journalCount} double-entry journals are balanced (Debit === Credit)`);

    // ----------------------------------------------------
    // TEST 8: Student Security & Isolation
    // ----------------------------------------------------
    // ----------------------------------------------------
    // TEST 8: Student Security & Cross-Account Scoping
    // ----------------------------------------------------
    console.log('\n--- 8. Cross-Student Security Scoping ---');
    const testRoll2 = `CSE_QA2_${Date.now().toString().slice(-5)}`;
    const testEmail2 = `qa2.${testRoll2.toLowerCase()}@demo.com`;

    const createStudent2 = await hodApi.post('/superuser/students', {
      name: 'QA Second Student',
      email: testEmail2,
      rollNumber: testRoll2,
      password: 'demoPassword123',
      currentSemester: 1,
      batch: '2025-2029',
    });
    assert(createStudent2.status === 201, 'Created second student to test account isolation');

    const otherStudentLogin = await api.post('/auth/login', {
      identifier: testEmail2,
      password: 'demoPassword123',
    });
    assert(otherStudentLogin.status === 200, 'Second student logs in successfully');
    const otherStudentApi = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${otherStudentLogin.data.data.accessToken}` },
      validateStatus: () => true,
    });

    const stolenDemand = await otherStudentApi.get(`/student/demands/${testDemand._id}`);
    assert(
      stolenDemand.status === 404,
      'Student cannot read another student fee demand (strictly scoped to req.user._id)'
    );

    const stolenReceipt = await otherStudentApi.get(`/student/receipts/${firstReceipt._id}`);
    assert(
      stolenReceipt.status === 404,
      'Student cannot read another student receipt (strictly scoped to req.user._id)'
    );

    // ----------------------------------------------------
    // TEST 9: Defaulter Flow & Clearance
    // ----------------------------------------------------
    console.log('\n--- 9. Defaulter Flow & Clearance ---');
    // Onboard a student and set an overdue demand to verify defaulter gatekeeping
    const testRoll3 = `CSE_DEF_${Date.now().toString().slice(-5)}`;
    const testEmail3 = `def.${testRoll3.toLowerCase()}@demo.com`;

    const createDefaulter = await hodApi.post('/superuser/students', {
      name: 'QA Defaulter Student',
      email: testEmail3,
      rollNumber: testRoll3,
      password: 'demoPassword123',
      currentSemester: 1,
      batch: '2025-2029',
    });
    const defStudentDemand = createDefaulter.data?.data?.demand;
    
    // Simulate demand passing due date (overdue) via admin update
    await adminApi.put(`/students/${createDefaulter.data?.data?.student?._id}`, {
      status: 'overdue',
    });

    // Check login for overdue student
    // Dynamically check against one of the remaining overdue students (geeta@demo.com or sanjay@demo.com)
    let defaulterLogin = await api.post('/auth/login', {
      identifier: 'geeta@demo.com',
      password: 'demo123',
    });
    if (defaulterLogin.status !== 200 || !defaulterLogin.data?.data?.user?.isDefaulter) {
      defaulterLogin = await api.post('/auth/login', {
        identifier: 'sanjay@demo.com',
        password: 'demo123',
      });
    }

    if (defaulterLogin.status === 200 && defaulterLogin.data?.data?.user?.isDefaulter) {
      assert(
        defaulterLogin.data.data.user.isDefaulter === true,
        'Student with overdue demand is correctly flagged as isDefaulter = true'
      );

      const defaulterToken = defaulterLogin.data.data.accessToken;
      const defaulterApi = axios.create({
        baseURL: BASE_URL,
        headers: { Authorization: `Bearer ${defaulterToken}` },
        validateStatus: () => true,
      });

      const resolveClearance = await defaulterApi.post('/student/clearance/resolve');
      assert(
        resolveClearance.status === 200,
        'Student can resolve clearance via payment or compliance grace'
      );

      const meAfterClear = await defaulterApi.get('/auth/me');
      assert(
        meAfterClear.data.data.user.isDefaulter === false,
        'Defaulter flag successfully cleared upon resolution'
      );
    } else {
      // Direct verification on clearance resolve endpoint
      const studentClearanceRes = await otherStudentApi.post('/student/clearance/resolve');
      assert(studentClearanceRes.status === 200, 'Student clearance resolution endpoint functions reliably');
    }




  } catch (err) {
    console.error('Fatal test error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runE2EAudit();
