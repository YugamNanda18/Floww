import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight,
  Sparkles, CheckCircle2, Shield, Activity, FileCheck, Layers
} from 'lucide-react';
import ThemeToggle from '../../components/ui/ThemeToggle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();

  const portals = [
    {
      id: 'student',
      title: 'Student Portal',
      tagline: 'Student Self-Service',
      icon: GraduationCap,
      description: 'Review pending semester dues, settle fees via instant online payment gateway, and resolve clearance holds in real time.',
      buttonText: 'Student Login',
      link: '/login?role=student',
      accentBorder: 'hover:border-indigo-500/50',
      accentBg: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
      features: [
        'Instant Razorpay online fee checkout',
        'Defaulter clearance hold auto-unlock',
        'Cryptographic SHA-256 payment receipts',
      ],
    },
    {
      id: 'admin',
      title: 'Finance Admin',
      tagline: 'Treasury & Cash Desk',
      icon: Building2,
      description: 'Verify offline Demand Drafts and counter cash collections, structure multi-term installment plans, and disburse caution money.',
      buttonText: 'Admin Login',
      link: '/login?role=admin',
      accentBorder: 'hover:border-emerald-500/50',
      accentBg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
      features: [
        'Demand Draft & bank challan verification',
        'Multi-term BNPL installment scheduling',
        'Caution money escrow & graduation refunds',
      ],
    },
    {
      id: 'superuser',
      title: 'Treasury Superuser',
      tagline: 'Registrar & Governance',
      icon: ShieldCheck,
      description: 'Publish departmental fee structures, grant institutional scholarships and late fee waivers, and raise bulk cohort fee demands.',
      buttonText: 'Superuser Login',
      link: '/login?role=superuser',
      accentBorder: 'hover:border-sky-500/50',
      accentBg: 'from-sky-500/10 via-sky-500/5 to-transparent',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
      buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/20',
      features: [
        'Departmental fee structures & bulk demands',
        'Institutional scholarships & late fee concessions',
        'Immutable double-entry audit journals',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-150 flex flex-col justify-between selection:bg-brand-500/20">
      {/* ─── Ambient Glow Background ───────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-25">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-500/20 via-sky-500/10 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* ─── Global Top Navigation Bar ─────────────────────────────────── */}
      <header className="relative z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-center p-0.5 shrink-0">
              <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-lg tracking-tight">Floww</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACID Engine Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <ThemeToggle variant="segmented" />

            {user ? (
              <Link
                to={user.role === 'student' ? (user.isDefaulter ? '/student/clearance' : '/student/dashboard') : `/${user.role}/dashboard`}
                className="btn btn-primary text-xs py-2 px-4 rounded-xl shadow-md flex items-center gap-1.5"
              >
                Go to Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-[var(--border-color)] hover:border-brand-500/50 hover:bg-[var(--bg-card-hover)] transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero & Gateway Console ────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full my-auto flex flex-col items-center">
        {/* Hero Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
            <Sparkles size={13} className="text-indigo-500" />
            <span>Institutional Fee Management & Treasury OS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
            College Treasury, <br />
            <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent">
              Precision Reimagined.
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
            Deterministic student billing with double-entry general ledger, automated defaulter compliance gates, flexible BNPL installments, and cryptographic receipts.
          </p>
        </div>

        {/* ─── Unified Institutional Portal Console ──────────────────────── */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl">
          {portals.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className={`group relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${card.accentBorder}`}
              >
                {/* Top Subtle Gradient Accents */}
                <div className={`absolute inset-x-0 top-0 h-28 rounded-t-2xl bg-gradient-to-b ${card.accentBg} pointer-events-none opacity-50`} />

                <div className="relative z-10">
                  {/* Icon & Tagline */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${card.iconBg}`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                      {card.tagline}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2.5">
                    {card.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                    {card.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-2 mb-8 border-t border-[var(--border-color)]/60 pt-4">
                    {card.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="relative z-10 pt-4 border-t border-[var(--border-color)]">
                  <Link
                    to={card.link}
                    id={`portal-login-${card.id}-btn`}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold justify-center shadow-md flex items-center gap-2 transition-all group-hover:gap-3 ${card.buttonClass}`}
                  >
                    <span>{card.buttonText}</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Integrated Architecture Telemetry Ribbon ─────────────────── */}
        <div className="w-full max-w-6xl mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Activity, title: '100% ACID Compliant', desc: 'Double-Entry Ledgers' },
            { icon: Shield, title: 'Automated Clearance', desc: 'Instant Hold Removal' },
            { icon: Layers, title: 'Caution Escrow', desc: 'Deposit & Refund Vault' },
            { icon: FileCheck, title: 'SHA-256 Verified', desc: 'Tamper-Evident Receipts' },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-card-hover)] flex items-center justify-center text-brand-500 shrink-0">
                  <ItemIcon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">{item.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── Global Footer ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[var(--border-color)] py-6 text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Floww Institutional Treasury OS · Production Release</span>
          </div>
          <p>© {new Date().getFullYear()} Floww. Double-entry bookkeeping, automated clearance, and financial escrow.</p>
        </div>
      </footer>
    </div>
  );
}
