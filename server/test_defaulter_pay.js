import http from 'http';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function simulateDefaulterPayment(email) {
  console.log(`\n================ Testing for ${email} ================`);
  // 1. Login
  const loginRes = await request('POST', '/api/auth/login', { email, password: 'password123' });
  let token = loginRes.body?.data?.accessToken;
  if (!token) {
    const loginRes2 = await request('POST', '/api/auth/login', { email, password: 'demo123' });
    token = loginRes2.body?.data?.accessToken;
  }
  const user = loginRes.body?.data?.user;
  console.log(`1. Login: ${email} | isDefaulter: ${user?.isDefaulter} | overdueCount: ${user?.overdueDemandsCount}`);

  // 2. Fetch demands as student
  const demandsRes = await request('GET', '/api/student/demands', null, token);
  const demands = demandsRes.body?.data || [];
  console.log(`2. Demands found: ${demands.length}`);
  const overdueDemands = demands.filter(d => d.status === 'overdue' || (new Date(d.dueDate) < new Date() && d.outstandingAmount > 0));
  console.log(`   Overdue demands count: ${overdueDemands.length}`);
  for (const d of overdueDemands) {
    console.log(`   -> Sem ${d.semester}: status=${d.status}, totalDemanded=${d.totalDemanded/100}, outstanding=${d.outstandingAmount/100}, lateFee=${d.lateFeeAccrued/100}`);
  }

  if (overdueDemands.length === 0) {
    console.log('   No overdue demands to pay.');
    return;
  }

  // 3. Create order for the first overdue demand (Full payment)
  const targetDemand = overdueDemands[0];
  const payable = targetDemand.outstandingAmount + (targetDemand.lateFeeAccrued || 0);
  console.log(`3. Creating payment order for Sem ${targetDemand.semester}: ₹${payable/100}`);
  const orderRes = await request('POST', '/api/payment/order', {
    demandId: targetDemand._id,
    amount: payable,
  }, token);

  const orderId = orderRes.body?.data?.orderId;
  console.log(`   Order created: ${orderId}, status=${orderRes.status}`);

  // 4. Verify payment
  console.log(`4. Verifying payment...`);
  const verifyRes = await request('POST', '/api/payment/verify', {
    razorpayOrderId: orderId,
    razorpayPaymentId: `pay_sim_${Date.now()}`,
    razorpaySignature: 'demo_signature',
  }, token);
  console.log(`   Payment verify status: ${verifyRes.status}, success: ${verifyRes.body?.success}`);

  // 5. Check /auth/me
  const meRes = await request('GET', '/api/auth/me', null, token);
  console.log(`5. Auth Me: isDefaulter=${meRes.body?.data?.user?.isDefaulter}, overdueCount=${meRes.body?.data?.user?.overdueDemandsCount}`);

  // 6. Check Dashboard
  const dashRes = await request('GET', '/api/student/dashboard', null, token);
  const dash = dashRes.body?.data;
  console.log(`6. Dashboard summary:`);
  console.log(`   Total Outstanding: ₹${(dash?.summary?.totalOutstanding || 0)/100}`);
  console.log(`   Total Paid: ₹${(dash?.summary?.totalPaid || 0)/100}`);
  console.log(`   Overdue Count: ${dash?.summary?.overdueCount}`);
  console.log(`   Current Demand Sem: ${dash?.currentDemand?.semester}, status: ${dash?.currentDemand?.status}, outstanding: ₹${(dash?.currentDemand?.outstandingAmount || 0)/100}`);
}

async function run() {
  for (const email of ['karan@demo.com', 'sanjay@demo.com', 'geeta@demo.com', 'aditya@demo.com']) {
    await simulateDefaulterPayment(email);
  }
}
run().catch(console.error);
