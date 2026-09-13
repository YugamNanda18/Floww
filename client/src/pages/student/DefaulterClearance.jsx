import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useRazorpay } from '../../hooks/useRazorpay.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Clock,
  LogOut,
  ArrowRight,
  Sparkles,
  Receipt,
  Info,
  ChevronRight,
  Unlock
} from 'lucide-react';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

export default function DefaulterClearance() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, processing } = useRazorpay();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [paymentType, setPaymentType] = useState('full'); // 'full' | 'flexi'
  const [customFlexiRupees, setCustomFlexiRupees] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clearedSuccessfully, setClearedSuccessfully] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState(null);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrder, setSandboxOrder] = useState(null);

  const fetchOverdueDemands = async () => {
    try {
      const res = await api.get('/student/demands');
      const allDemands = res.data.data || [];
      const overdueList = allDemands.filter(
        (d) => d.status === 'overdue' || (new Date(d.dueDate) < new Date() && d.outstandingAmount > 0)
      );

      setDemands(overdueList.length > 0 ? overdueList : allDemands.filter((d) => d.status !== 'paid'));
      if (overdueList.length > 0) {
        setSelectedDemand(overdueList[0]);
      } else if (allDemands.length > 0) {
        setSelectedDemand(allDemands[0]);
      } else {
        // No dues at all — unlock!
        handleUnlockPortal();
      }
    } catch (err) {
      toast.error('Failed to load dues details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueDemands();
  }, []);

  const handleUnlockPortal = async () => {
    try {
      await api.post('/student/clearance/resolve');
      const meRes = await api.get('/auth/me');
      if (meRes.data.data?.user) {
        setUser({ ...meRes.data.data.user, isDefaulter: false, overdueDemandsCount: 0 });
      } else if (user) {
        setUser({ ...user, isDefaulter: false, overdueDemandsCount: 0 });
      }
    } catch {
      if (user) {
        setUser({ ...user, isDefaulter: false, overdueDemandsCount: 0 });
      }
    }
    navigate('/student/dashboard', { replace: true });
  };

  const outstandingPaise = selectedDemand ? selectedDemand.outstandingAmount || 0 : 0;
  const lateFeePaise = selectedDemand ? selectedDemand.lateFeeAccrued || 0 : 0;
  const totalDuePaise = outstandingPaise + lateFeePaise;

  const payablePaise =
    paymentType === 'full'
      ? totalDuePaise
      : Math.min(
          Math.max(Math.round((parseFloat(customFlexiRupees) || 0) * 100), 10000), // min ₹100
          totalDuePaise
        );

  const handleInitiatePayment = async (forceSimulate = false) => {
    if (!selectedDemand) {
      toast.error('Please select an overdue fee demand.');
      return;
    }

    if (totalDuePaise <= 0) {
      toast.success('Zero dues remaining!');
      handleUnlockPortal();
      return;
    }

    if (paymentType === 'flexi' && (!customFlexiRupees || parseFloat(customFlexiRupees) < 100)) {
      toast.error('Minimum flexi payment amount is ₹100.');
      return;
    }

    setSubmitting(true);
    const idempotencyKey = uuidv4();

    try {
      const orderRes = await api.post(
        '/payment/order',
        {
          demandId: selectedDemand._id,
          amount: payablePaise,
        },
        {
          headers: { 'X-Idempotency-Key': idempotencyKey },
        }
      );

      const orderData = orderRes.data.data;
      const { orderId, amount, currency, keyId, prefill } = orderData;

      if (forceSimulate) {
        setSandboxOrder({ orderData, idempotencyKey });
        setShowSandboxModal(true);
        setSubmitting(false);
        return;
      }

      await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        prefill,
        onSuccess: async (response) => {
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              demandId: selectedDemand?._id,
              amount: payablePaise,
            });
            await handlePaymentSettled(verifyRes.data.data.receipt);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setSubmitting(false);
          }
        },
        onFailure: () => {
          setSandboxOrder({ orderData, idempotencyKey });
          setShowSandboxModal(true);
          setSubmitting(false);
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed.');
      setSubmitting(false);
    }
  };

  const handleCompleteSandbox = async (method = 'card') => {
    if (!sandboxOrder) return;
    setSubmitting(true);
    try {
      const demoPaymentId = `pay_defaulter_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const verifyRes = await api.post('/payment/verify', {
        razorpayOrderId: sandboxOrder.orderData.orderId,
        razorpayPaymentId: demoPaymentId,
        razorpaySignature: 'demo_signature',
        demandId: selectedDemand?._id,
        amount: payablePaise,
      });

      await handlePaymentSettled(verifyRes.data.data.receipt);
      setShowSandboxModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSettled = async (receipt) => {
    toast.success('🎉 Dues settled! Redirecting to student dashboard...');
    setLatestReceipt(receipt);
    setClearedSuccessfully(true);

    try {
      await api.post('/student/clearance/resolve');
      const meRes = await api.get('/auth/me');
      if (meRes.data.data?.user) {
        setUser({ ...meRes.data.data.user, isDefaulter: false, overdueDemandsCount: 0 });
      } else if (user) {
        setUser({ ...user, isDefaulter: false, overdueDemandsCount: 0 });
      }
    } catch {
      if (user) {
        setUser({ ...user, isDefaulter: false, overdueDemandsCount: 0 });
      }
    }

    // Auto-redirect to Student Dashboard
    setTimeout(() => {
      navigate('/student/dashboard');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-10 h-10 border-4 border-danger-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center border border-danger-500/20">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight">LedgerX Treasury</span>
            <p className="text-xs text-danger-500 font-semibold uppercase tracking-wider">
              Student Clearance Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
            Logged in as <strong className="text-[var(--text-primary)]">{user?.name}</strong> ({user?.rollNumber})
          </span>
          <button
            onClick={logout}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full py-8 space-y-6">
        {clearedSuccessfully ? (
          /* UNLOCKED SUCCESS VIEW */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 text-center space-y-6 max-w-xl mx-auto border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Unlock size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Clearance Approved! Access Restored
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Your payment has been settled into the double-entry accounting ledger. Your student portal access has been fully reactivated.
              </p>
              {latestReceipt && (
                <p className="text-xs font-mono text-[var(--text-muted)]">
                  Receipt #{latestReceipt.receiptNumber} · Verified Authentic
                </p>
              )}
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="primary"
                onClick={handleUnlockPortal}
                className="py-3 px-6 font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Enter Student Portal <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        ) : (
          /* RESTRICTION NOTICE & PAYMENT ACTION */
          <div className="space-y-6">
            {/* High-Impact Lockout Warning Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-danger-500/10 border-2 border-danger-500/30 text-danger-900 dark:text-danger-200 shadow-xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-danger-500/30">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-danger-600 dark:text-danger-400">
                    STUDENT PORTAL ACCESS TEMPORARILY LOCKED
                  </h2>
                  <p className="text-xs text-danger-700 dark:text-danger-300 font-medium">
                    Statutory overdue semester liabilities detected for {user?.name} ({user?.rollNumber}).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card)]/80 border border-danger-500/20 text-xs text-[var(--text-secondary)] leading-relaxed">
                Under Institutional Treasury Bylaws, regular student portal access, exam hall ticket downloads, and registration services are restricted until overdue balances are cleared or a compliant flexi-payment installment is committed.
              </div>
            </motion.div>

            {/* Overdue Demands & Payment Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overdue Demands Selector */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Clock size={16} className="text-danger-500" /> Overdue Liabilities Schedule
                    </h3>
                    <span className="text-xs font-semibold text-danger-500">
                      {demands.length} Pending Assessment(s)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {demands.map((demand) => {
                      const isSelected = selectedDemand?._id === demand._id;
                      const totalItemDue = demand.outstandingAmount + (demand.lateFeeAccrued || 0);

                      return (
                        <div
                          key={demand._id}
                          onClick={() => setSelectedDemand(demand)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-danger-500 bg-danger-50/40 dark:bg-danger-500/10 shadow-md'
                              : 'border-[var(--border-color)] bg-[var(--bg-base)] hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--text-primary)]">
                                Semester {demand.semester} ({demand.academicYear})
                              </span>
                              <Badge variant="danger">OVERDUE</Badge>
                            </div>
                            <span className="font-extrabold text-base text-danger-600 dark:text-danger-400">
                              {fmt(totalItemDue)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                            <div>Demanded: {fmt(demand.totalDemanded)}</div>
                            <div>Paid So Far: {fmt(demand.totalPaid)}</div>
                            <div className="text-right text-danger-500 font-semibold">
                              Late Penalty: +{fmt(demand.lateFeeAccrued)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Differentiator Info */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 text-xs text-[var(--text-secondary)] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
                    <Sparkles size={14} /> Real-Time Institutional Reactivation
                  </div>
                  <p>
                    Unlike manual offline finance approvals that take days to update your status, payments through this gateway trigger atomic ACID transactions in the college double-entry ledger, automatically unlocking your student dashboard.
                  </p>
                </div>
              </div>

              {/* Payment Settlement Checkout Panel */}
              <div>
                <Card className="p-6 space-y-5">
                  <div className="border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <CreditCard size={18} className="text-brand-500" /> Clearance Checkout
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Settle in full or make a flexi payment to unfreeze
                    </p>
                  </div>

                  {/* Payment Mode Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase">
                      Clearance Plan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType('full')}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          paymentType === 'full'
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 font-bold text-brand-600 dark:text-brand-400 shadow-sm'
                            : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-wide">Full Clearance</div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)] mt-1">
                          {fmt(totalDuePaise)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentType('flexi')}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          paymentType === 'flexi'
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 font-bold text-brand-600 dark:text-brand-400 shadow-sm'
                            : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-wide">Flexi-Pay</div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)] mt-1">
                          Partial / Custom
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Custom Flexi Input */}
                  {paymentType === 'flexi' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5"
                    >
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">
                        Enter Flexi Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="100"
                          max={totalDuePaise / 100}
                          placeholder="e.g. 10000"
                          value={customFlexiRupees}
                          onChange={(e) => setCustomFlexiRupees(e.target.value)}
                          className="input pl-8 text-sm font-bold w-full"
                        />
                      </div>
                      <p className="text-[11px] text-brand-500">
                        Paying any amount ≥ ₹100 clears default status.
                      </p>
                    </motion.div>
                  )}

                  {/* Amount Pill */}
                  <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] uppercase">Amount to Settle</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)]">
                        {fmt(payablePaise)}
                      </p>
                    </div>
                    <Badge variant="brand">ACID GUARANTEED</Badge>
                  </div>

                  {/* Razorpay Test Credentials Pill */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Info size={13} /> Razorpay Test Gateway Available
                    </div>
                    <div>Card: <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">4111 1111 1111 1111</code> · CVV: <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">123</code></div>
                  </div>

                  {/* Primary Pay Button */}
                  <button
                    id="pay-clearance-btn"
                    onClick={() => handleInitiatePayment(false)}
                    disabled={submitting || processing}
                    className="btn btn-primary w-full py-3.5 text-sm justify-center font-bold flex items-center gap-2 shadow-lg shadow-brand-500/25"
                  >
                    {submitting || processing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={17} /> Settle {fmt(payablePaise)} & Unfreeze
                      </>
                    )}
                  </button>

                  {/* Fast Instant Sandbox Simulator */}
                  <button
                    type="button"
                    onClick={() => handleInitiatePayment(true)}
                    disabled={submitting || processing}
                    className="btn btn-secondary w-full text-xs py-2 justify-center flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <Sparkles size={13} className="text-brand-500" /> Instant Test Sandbox Payment
                  </button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-[var(--text-muted)] pt-6 border-t border-[var(--border-color)]">
        LedgerX Enterprise Treasury Management System · Cryptographically Audited
      </div>

      {/* Sandbox Checkout Modal */}
      <AnimatePresence>
        {showSandboxModal && sandboxOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    Rzp
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Razorpay Clearance Sandbox</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Order: {sandboxOrder.orderData.orderId}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  {fmt(sandboxOrder.orderData.amount)}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Simulate a clearance payment to settle debts and unfreeze account:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCompleteSandbox('upi')}
                    disabled={submitting}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] hover:border-brand-500 hover:bg-brand-50/20 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span>📱</span> Instant UPI (GPay / PhonePe)
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleCompleteSandbox('card')}
                    disabled={submitting}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] hover:border-brand-500 hover:bg-brand-50/20 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span>💳</span> Test Card (4111-1111-1111-1111)
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleCompleteSandbox('netbanking')}
                    disabled={submitting}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] hover:border-brand-500 hover:bg-brand-50/20 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span>🏦</span> NetBanking (HDFC / SBI / ICICI)
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowSandboxModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
