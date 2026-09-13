import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useRazorpay } from '../../hooks/useRazorpay.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Sparkles,
  Info,
  Layers,
  Database,
  Lock,
  ChevronRight,
  Download
} from 'lucide-react';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

export default function PayFees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openCheckout, processing } = useRazorpay();

  const [demands, setDemands] = useState([]);
  const [selectedDemandId, setSelectedDemandId] = useState(searchParams.get('demandId') || '');
  const [paymentType, setPaymentType] = useState('full'); // 'full' | 'partial'
  const [partialRupees, setPartialRupees] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulatingOrder, setSimulatingOrder] = useState(null);

  useEffect(() => {
    fetchDemands();
  }, []);

  const fetchDemands = async () => {
    try {
      const res = await api.get('/student/demands');
      const allDemands = res.data.data || [];
      setDemands(allDemands);

      // Default select first unpaid/overdue demand or the one in query param
      const queryId = searchParams.get('demandId');
      if (queryId && allDemands.some((d) => d._id === queryId)) {
        setSelectedDemandId(queryId);
      } else {
        const firstUnpaid = allDemands.find((d) => d.status !== 'paid') || allDemands[0];
        if (firstUnpaid) setSelectedDemandId(firstUnpaid._id);
      }
    } catch (err) {
      toast.error('Failed to load fee demands.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDemand = demands.find((d) => d._id === selectedDemandId) || demands[0];

  const outstandingPaise = selectedDemand ? selectedDemand.outstandingAmount || 0 : 0;
  const lateFeePaise = selectedDemand ? selectedDemand.lateFeeAccrued || 0 : 0;
  const totalPayablePaise = outstandingPaise + lateFeePaise;

  const currentPayAmountPaise =
    paymentType === 'full'
      ? totalPayablePaise
      : Math.min(Math.max(Math.round((parseFloat(partialRupees) || 0) * 100), 10000), totalPayablePaise);

  const handleInitiatePayment = async (forceSimulate = false) => {
    if (!selectedDemand) {
      toast.error('Please select a fee demand.');
      return;
    }

    if (totalPayablePaise <= 0) {
      toast.success('This fee demand is already fully cleared!');
      return;
    }

    if (paymentType === 'partial' && (!partialRupees || parseFloat(partialRupees) < 100)) {
      toast.error('Minimum partial payment amount is ₹100.');
      return;
    }

    setSubmitting(true);
    const idempotencyKey = uuidv4();

    try {
      // 1. Create Order on Backend
      const orderRes = await api.post(
        '/payment/order',
        {
          demandId: selectedDemand._id,
          amount: currentPayAmountPaise,
        },
        {
          headers: { 'X-Idempotency-Key': idempotencyKey },
        }
      );

      const orderData = orderRes.data.data;
      const { orderId, amount, currency, keyId, prefill } = orderData;

      // If forced test simulation:
      if (forceSimulate) {
        setSimulatingOrder({ orderData, idempotencyKey });
        setShowSimulateModal(true);
        setSubmitting(false);
        return;
      }

      // 2. Open standard Razorpay Checkout
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
              demandId: selectedDemand._id,
              amount: currentPayAmountPaise,
            });
            toast.success('Payment verified & settled into double-entry ledger!');
            setSuccessReceipt(verifyRes.data.data.receipt);
            fetchDemands();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setSubmitting(false);
          }
        },
        onFailure: (error) => {
          // If Razorpay modal throws error (e.g. invalid test keys), offer test simulation
          setSimulatingOrder({ orderData, idempotencyKey });
          setShowSimulateModal(true);
          setSubmitting(false);
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to initiate payment.');
      setSubmitting(false);
    }
  };

  const handleCompleteSimulatedPayment = async (method = 'card') => {
    if (!simulatingOrder) return;
    setSubmitting(true);
    try {
      const demoPaymentId = `pay_demo_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const verifyRes = await api.post('/payment/verify', {
        razorpayOrderId: simulatingOrder.orderData.orderId,
        razorpayPaymentId: demoPaymentId,
        razorpaySignature: 'demo_signature',
        demandId: selectedDemand?._id,
        amount: currentPayAmountPaise,
      });

      toast.success('🎉 Payment successful! ACID ledger entries generated.');
      setSuccessReceipt(verifyRes.data.data.receipt);
      setShowSimulateModal(false);
      fetchDemands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Fee Payment Gateway"
        subtitle="Settle semester fees instantly with ACID ledger guarantees and SHA-256 cryptographic receipts."
        breadcrumbs={['Student Portal', 'Pay Fees']}
      />

      {/* Success View */}
      <AnimatePresence>
        {successReceipt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 text-[var(--text-primary)]"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    Payment Successful & Settled!
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Receipt #{successReceipt.receiptNumber} · Verified in immutable ledger
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/student/receipts/${successReceipt._id}`}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Receipt size={14} /> View Official Receipt
                </Link>
                <button
                  onClick={() => setSuccessReceipt(null)}
                  className="btn btn-secondary text-xs py-2 px-3"
                >
                  Pay Another
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Demand Selector & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demand Selection Tabs */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-brand-500" /> Select Semester Demand
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demands.map((demand) => {
                const isSelected = demand._id === selectedDemandId;
                const isOverdue = demand.status === 'overdue';
                const isPaid = demand.status === 'paid';
                const dueTotal = demand.outstandingAmount + (demand.lateFeeAccrued || 0);

                return (
                  <div
                    key={demand._id}
                    onClick={() => {
                      setSelectedDemandId(demand._id);
                      setSuccessReceipt(null);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 shadow-sm'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        Semester {demand.semester}
                      </span>
                      <Badge
                        variant={
                          isPaid
                            ? 'success'
                            : isOverdue
                            ? 'danger'
                            : demand.status === 'partial'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {demand.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-baseline text-xs text-[var(--text-secondary)]">
                      <span>Academic Year {demand.academicYear}</span>
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        {isPaid ? 'Cleared' : fmt(dueTotal)}
                      </span>
                    </div>

                    {isOverdue && (
                      <div className="mt-2 text-[11px] text-danger-500 flex items-center gap-1 font-medium">
                        <AlertTriangle size={12} /> Includes Late Fee {fmt(demand.lateFeeAccrued)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Detailed Component Breakdown Card */}
          {selectedDemand && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Fee Breakdown — Sem {selectedDemand.semester} ({selectedDemand.academicYear})
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Official Fee Schedule prescribed by Board of Governors
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--text-muted)]">Due Date</span>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {new Date(selectedDemand.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Table of Components */}
              <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden mb-5">
                <div className="grid grid-cols-12 bg-[var(--bg-base)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)]">
                  <div className="col-span-6">Component</div>
                  <div className="col-span-3 text-right">Demanded</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>

                {selectedDemand.components?.map((comp, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 px-4 py-3 text-xs items-center hover:bg-[var(--bg-base)]/50 transition-colors"
                  >
                    <div className="col-span-6 font-medium text-[var(--text-primary)]">
                      {comp.name}
                    </div>
                    <div className="col-span-3 text-right font-semibold text-[var(--text-primary)]">
                      {fmt(comp.demandedAmount)}
                    </div>
                    <div className="col-span-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          comp.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : comp.status === 'partial'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {comp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Items */}
              <div className="space-y-2 text-xs border-t border-[var(--border-color)] pt-4">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Base Semester Tuition & Levies</span>
                  <span>{fmt(selectedDemand.totalDemanded)}</span>
                </div>

                {selectedDemand.totalPaid > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Amount Previously Paid</span>
                    <span>- {fmt(selectedDemand.totalPaid)}</span>
                  </div>
                )}

                {selectedDemand.scholarshipAmount > 0 && (
                  <div className="flex justify-between text-violet-600 dark:text-violet-400">
                    <span>Institutional Scholarship Applied</span>
                    <span>- {fmt(selectedDemand.scholarshipAmount)}</span>
                  </div>
                )}

                {lateFeePaise > 0 && (
                  <div className="flex justify-between text-danger-600 dark:text-danger-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> Late Fee Penalty (Overdue)
                    </span>
                    <span>+ {fmt(lateFeePaise)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                  <span>Net Outstanding Balance</span>
                  <span className="text-base text-brand-600 dark:text-brand-400">
                    {fmt(totalPayablePaise)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Educational FinTech Differentiator Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-600/10 via-indigo-600/5 to-violet-600/10 border border-brand-500/20 text-xs text-[var(--text-secondary)] space-y-3">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
              <Sparkles size={16} /> Why is LedgerX different from traditional fees portals?
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                  <Database size={14} className="text-brand-500" /> Double-Entry Ledger
                </div>
                Traditional portals merely update a student row. LedgerX generates immutable DR/CR pairs for every single transaction.
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                  <Lock size={14} className="text-emerald-500" /> ACID Transaction
                </div>
                Zero ghost debits. Payment capture, ledger posting, and demand clearing succeed or fail atomically together.
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} className="text-violet-500" /> Cryptographic SHA-256
                </div>
                Receipts include tamper-proof digital signatures that can be independently audited anytime.
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Payment Action Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-brand-500" /> Checkout
            </h3>

            {totalPayablePaise <= 0 ? (
              <div className="p-6 text-center text-xs space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Zero Dues Outstanding!</p>
                <p className="text-[var(--text-muted)]">
                  All demanded fees for Semester {selectedDemand?.semester} have been completely paid.
                </p>
                <Link to="/student/history" className="btn btn-secondary text-xs w-full">
                  View Payment Receipts
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Payment Option Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Payment Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('full')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        paymentType === 'full'
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 font-semibold text-brand-600 dark:text-brand-400'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-xs">Full Settlement</div>
                      <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                        {fmt(totalPayablePaise)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('partial')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        paymentType === 'partial'
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 font-semibold text-brand-600 dark:text-brand-400'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-xs">Custom / Partial</div>
                      <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                        Flexi-Pay
                      </div>
                    </button>
                  </div>
                </div>

                {/* Partial Amount Input */}
                {paymentType === 'partial' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Enter Amount to Pay (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="100"
                        max={totalPayablePaise / 100}
                        placeholder="e.g. 25000"
                        value={partialRupees}
                        onChange={(e) => setPartialRupees(e.target.value)}
                        className="input pl-8 text-sm font-bold"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Max: {fmt(totalPayablePaise)} · Min: ₹100
                    </p>
                  </motion.div>
                )}

                {/* Total Display */}
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">You are paying</p>
                    <p className="text-xl font-extrabold text-[var(--text-primary)]">
                      {fmt(currentPayAmountPaise)}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-sm">
                    ₹
                  </div>
                </div>

                {/* Razorpay Test Keys Pill */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Info size={13} /> Razorpay Test Gateway Active
                  </div>
                  <div>Test Card: <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">4111 1111 1111 1111</code> · CVV: <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">123</code></div>
                </div>

                {/* Pay Button */}
                <button
                  id="pay-fees-submit-btn"
                  onClick={() => handleInitiatePayment(false)}
                  disabled={submitting || processing}
                  className="btn btn-primary w-full py-3 text-sm justify-center font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  {submitting || processing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={16} /> Pay {fmt(currentPayAmountPaise)} Now
                    </>
                  )}
                </button>

                {/* Fast Sandbox Simulator Button */}
                <button
                  type="button"
                  onClick={() => handleInitiatePayment(true)}
                  disabled={submitting || processing}
                  className="btn btn-secondary w-full text-xs py-2 justify-center flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <Sparkles size={13} className="text-brand-500" /> Instant Test Sandbox Payment
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Simulated Sandbox Checkout Modal */}
      <AnimatePresence>
        {showSimulateModal && simulatingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    Rzp
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Razorpay Checkout Sandbox</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Order: {simulatingOrder.orderData.orderId}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  {fmt(simulatingOrder.orderData.amount)}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Simulate a successful payment using any test instrument:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCompleteSimulatedPayment('upi')}
                    disabled={submitting}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] hover:border-brand-500 hover:bg-brand-50/20 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span>📱</span> Instant UPI (GPay / PhonePe)
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleCompleteSimulatedPayment('card')}
                    disabled={submitting}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] hover:border-brand-500 hover:bg-brand-50/20 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span>💳</span> Test Card (4111-1111-1111-1111)
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleCompleteSimulatedPayment('netbanking')}
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
                  onClick={() => setShowSimulateModal(false)}
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
