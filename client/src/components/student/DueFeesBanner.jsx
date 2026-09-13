import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import LateFeeCounter from './LateFeeCounter.jsx';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DueFeesBanner({ demand, daysOverdue, dailyPenaltyRate, onPayNow }) {
  if (!demand) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-success text-white shadow-glow-success"
      >
        <div className="flex items-center gap-3">
          <CheckCircle size={28} />
          <div>
            <h2 className="text-lg font-bold">No Pending Fees 🎉</h2>
            <p className="text-green-100 text-sm">All your fees are cleared. Keep it up!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const totalBalanceDue = Math.max(0, (demand.outstandingAmount || 0) + (demand.lateFeeAccrued || 0));
  const isPaid = demand.status === 'paid' || totalBalanceDue <= 0;
  const isOverdue = !isPaid && demand.status === 'overdue' && daysOverdue > 0;
  const isPartial = !isPaid && (demand.status === 'partial' || (demand.totalPaid > 0 && totalBalanceDue > 0));

  const bannerClass = isPaid
    ? 'banner-paid'
    : isOverdue
    ? 'banner-overdue'
    : isPartial
    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
    : 'banner-due';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 ${bannerClass} text-white shadow-2xl`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left: status + amount */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPaid ? (
              <><CheckCircle size={18} /><span className="text-sm font-medium text-white/80">All Clear — No Pending Dues 🎉</span></>
            ) : isOverdue ? (
              <><AlertTriangle size={18} /><span className="text-sm font-medium text-white/80">OVERDUE — {daysOverdue} days</span></>
            ) : isPartial ? (
              <><Clock size={18} /><span className="text-sm font-medium text-white/80">FLEXI-PAY ACTIVE · Compliant (Next Due: {fmtDate(demand.dueDate)})</span></>
            ) : (
              <><Clock size={18} /><span className="text-sm font-medium text-white/80">Due Date: {fmtDate(demand.dueDate)}</span></>
            )}
          </div>

          <h2 className="text-3xl font-bold tracking-tight mb-1">
            {isPaid ? '₹0' : fmt(totalBalanceDue)}
          </h2>
          <p className="text-white/70 text-sm">
            Semester {demand.semester} · {demand.academicYear} · {isPaid ? `Fully Cleared (Total Settled: ${fmt(demand.totalPaid || demand.totalDemanded)})` : `Total Demanded: ${fmt(demand.totalDemanded)}`}
          </p>

          {/* Component breakdown or clearance badge */}
          {isPaid ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-100 bg-emerald-500/20 px-3 py-1.5 rounded-xl w-fit border border-emerald-400/30">
              <CheckCircle size={14} className="text-emerald-300" />
              <span>Full Settlement Verified by Treasury · Zero Pending Liabilities</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-3">
              {demand.components?.map((c) => {
                const bal = Math.max(0, (c.demandedAmount || 0) - (c.paidAmount || 0) - (c.waivedAmount || 0));
                return (
                  <span
                    key={c.name}
                    className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm"
                  >
                    {c.name}: {bal === 0 ? '✓ Paid' : `Due ${fmt(bal)}`}
                  </span>
                );
              })}
            </div>
          )}

          {/* Late fee accrual */}
          {isOverdue && demand.lateFeeAccrued > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-white/90">
              <AlertTriangle size={14} />
              <span>Late fee accrued: <strong>{fmt(demand.lateFeeAccrued)}</strong></span>
              {dailyPenaltyRate && (
                <LateFeeCounter outstanding={demand.outstandingAmount} dailyRate={dailyPenaltyRate} />
              )}
            </div>
          )}
        </div>

        {/* Right: CTA */}
        {!isPaid && (
          <div className="flex flex-col gap-3 lg:items-end">
            <motion.button
              id="pay-now-btn"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onPayNow}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-600 font-bold text-sm shadow-lg hover:shadow-xl transition-all"
            >
              <CreditCard size={18} />
              Pay Now
              <ArrowRight size={16} />
            </motion.button>
            <p className="text-white/60 text-xs text-center">UPI · Cards · NetBanking</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
