import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Cpu, FlaskConical, Code2, GraduationCap } from 'lucide-react';

const componentIcons = {
  Tuition: GraduationCap,
  CRT: Code2,
  Development: Cpu,
  Lab: FlaskConical,
  Exam: BookOpen,
  Library: BookOpen,
};

const componentColors = {
  Tuition: 'from-blue-500 to-indigo-600',
  CRT: 'from-violet-500 to-purple-600',
  Development: 'from-emerald-500 to-teal-600',
  Lab: 'from-orange-500 to-amber-600',
  Exam: 'from-pink-500 to-rose-600',
  Library: 'from-cyan-500 to-sky-600',
};

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

export default function FeeBreakdownCard({ component, index }) {
  const Icon = componentIcons[component.name] || BookOpen;
  const colorClass = componentColors[component.name] || 'from-slate-500 to-slate-600';
  const pctPaid = component.demandedAmount > 0
    ? Math.min(100, Math.round((component.paidAmount / component.demandedAmount) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="card p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        <span className={`badge ${component.status === 'paid' ? 'badge-success' : component.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
          {component.status}
        </span>
      </div>

      <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">{component.name}</p>
      <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{fmt(component.demandedAmount)}</p>

      {component.paidAmount > 0 && (
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Paid: {fmt(component.paidAmount)}
        </p>
      )}

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-slate-100 dark:bg-surface-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctPaid}%` }}
          transition={{ duration: 0.8, delay: index * 0.07 + 0.3 }}
          className={`h-full bg-gradient-to-r ${colorClass} rounded-full`}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1">{pctPaid}% paid</p>
    </motion.div>
  );
}
