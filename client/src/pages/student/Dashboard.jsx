import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import { useRazorpay } from '../../hooks/useRazorpay.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import DueFeesBanner from '../../components/student/DueFeesBanner.jsx';
import FeeBreakdownCard from '../../components/student/FeeBreakdownCard.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';
import {
  TrendingUp, Receipt, CheckCircle, AlertTriangle, IndianRupee, Clock,
  UserCheck, Calendar, Coffee, ArrowRight, MapPin, Calculator, ShieldCheck, User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);

export default function StudentDashboard() {
  const { user } = useAuth();
  const { openCheckout, processing } = useRazorpay();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/student/dashboard');
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const navigate = useNavigate();

  const handlePayNow = () => {
    if (data?.currentDemand) {
      navigate(`/student/pay?demandId=${data.currentDemand._id}`);
    } else {
      navigate('/student/pay');
    }
  };

  if (loading) return <PageSpinner />;

  const { currentDemand, daysOverdue, dailyPenaltyRate, summary, recentReceipts, attendance, todaySchedule } = data || {};

  const statCards = [
    {
      label: 'Total Outstanding',
      value: fmt(summary?.totalOutstanding),
      icon: IndianRupee,
      color: summary?.totalOutstanding > 0 ? 'text-danger-500' : 'text-success-500',
      bg: summary?.totalOutstanding > 0 ? 'bg-danger-50 dark:bg-danger-500/10' : 'bg-success-50 dark:bg-success-500/10',
    },
    {
      label: 'Total Paid',
      value: fmt(summary?.totalPaid),
      icon: CheckCircle,
      color: 'text-success-500',
      bg: 'bg-success-50 dark:bg-success-500/10',
    },
    {
      label: 'Overdue Demands',
      value: summary?.overdueCount || 0,
      icon: AlertTriangle,
      color: summary?.overdueCount > 0 ? 'text-warning-500' : 'text-slate-400',
      bg: summary?.overdueCount > 0 ? 'bg-warning-50 dark:bg-warning-500/10' : 'bg-slate-100 dark:bg-surface-700',
    },
    {
      label: 'Current Semester',
      value: user?.currentSemester,
      suffix: `/ 8`,
      icon: TrendingUp,
      color: 'text-brand-500',
      bg: 'bg-brand-50 dark:bg-brand-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-3.5">
          <Link to="/student/profile" className="relative group shrink-0" title="View Digital ID Pass">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-500/40 shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-lg font-bold shadow-md">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[var(--bg-card)] rounded-full" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Welcome, {user?.name?.split(' ')[0]} 👋
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500">
                {user?.gender === 'female' ? '♀ Female' : '♂ Male'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-[var(--text-secondary)]">{user?.rollNumber || 'CSE2501'}</span>
              <span>·</span>
              <span>{user?.batch || 'B.Tech'}</span>
              <span>·</span>
              <span className="font-medium text-brand-500">Semester {user?.currentSemester || 1}</span>
            </p>
          </div>
        </div>

        <Link
          to="/student/profile"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-card-hover)] text-[var(--text-primary)] hover:border-brand-500/40 border border-[var(--border-color)] transition-all shrink-0"
        >
          <User size={14} className="text-brand-500" />
          <span>Digital Student ID Pass</span>
          <ArrowRight size={12} className="text-[var(--text-muted)]" />
        </Link>
      </div>

      {/* Hero Banner */}
      <DueFeesBanner
        demand={currentDemand}
        daysOverdue={daysOverdue}
        dailyPenaltyRate={dailyPenaltyRate}
        onPayNow={handlePayNow}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={16} className={s.color} />
              </div>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>
              {s.value}{s.suffix && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{s.suffix}</span>}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ─── Academic Attendance & Today's Schedule Row ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Compliance Widget */}
        <div className="card p-5 flex flex-col justify-between border-brand-500/20">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Attendance Health & 75% Gate</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Minimum 75% per subject required for exams</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                attendance?.hasShortage
                  ? 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {attendance?.hasShortage ? `${attendance.shortageSubjectsCount} Shortage` : '75% Satisfied'}
              </span>
            </div>

            <div className="my-4 flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                  {attendance?.overallPercentage || 0}%
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Overall Academic Attendance</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {attendance?.totalSubjects || 5} Total Subjects
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {attendance?.hasShortage ? 'Action needed to reach 75%' : 'Eligible for all exams'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--border-color)] h-2.5 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (attendance?.overallPercentage || 0) >= 75 ? 'bg-emerald-500' : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min(100, attendance?.overallPercentage || 0)}%` }}
              />
            </div>
          </div>

          <Link
            to="/student/attendance"
            className="w-full py-2.5 px-3 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Calculator size={14} />
            <span>Open 75% Calculator & Bunk Planner</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Today's Timetable Schedule Widget */}
        <div className="card p-5 flex flex-col justify-between border-[var(--border-color)]">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Today's Schedule ({todaySchedule?.day || 'Today'})
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {todaySchedule?.collegeHours || '08:00 AM - 03:00 PM'} (Mon–Sat)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                6 Sessions
              </span>
            </div>

            {/* Lunch Break Banner */}
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <Coffee size={13} className="text-amber-500" />
                Lunch Break: {todaySchedule?.lunchBreak || '11:15 AM - 12:00 PM'}
              </span>
              <span className="text-[10px] uppercase font-bold">45 Mins</span>
            </div>

            {/* Lecture Preview Slots */}
            <div className="space-y-2 mb-4">
              {(todaySchedule?.slots?.slice(0, 3) || []).map((slot, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-[11px] w-28 shrink-0">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-[200px]">
                      {slot.subjectName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                    <MapPin size={11} className="text-amber-500" />
                    {slot.room}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/student/timetable"
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={14} className="text-brand-500" />
            <span>View Full Mon–Sat Timetable</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>


      {/* Fee Component Breakdown */}
      {currentDemand?.components?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
            Current Semester Breakdown
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {currentDemand.components.map((comp, i) => (
              <FeeBreakdownCard key={comp.name} component={comp} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Receipts */}
      {recentReceipts?.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Receipt size={16} /> Recent Receipts
            </h2>
            <Link to="/student/history" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentReceipts.map((r) => (
              <Link
                key={r._id}
                to={`/student/receipts/${r._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-700 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
                    <Receipt size={14} className="text-success-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{r.receiptNumber}</p>
                    <p className="text-xs text-[var(--text-muted)]">Sem {r.semester} · {r.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success-600">{fmt(r.amountPaid)}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(r.issuedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
