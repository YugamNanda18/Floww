import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserCheck, AlertTriangle, CheckCircle2, Calculator,
  Sparkles, TrendingUp, Sliders, ArrowUpRight, Award, HelpCircle
} from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive Smart Calculator State
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [simExtraAttended, setSimExtraAttended] = useState(0);
  const [simExtraMissed, setSimExtraMissed] = useState(0);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/student/attendance');
        setAttendance(res.data.data);
      } catch (err) {
        toast.error('Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <PageSpinner />;

  const subjects = attendance?.subjects || [];
  const selectedSubject = subjects[selectedSubIndex] || subjects[0];

  // Calculate live numbers for the selected subject in the calculator
  const calcSubjectStats = () => {
    if (!selectedSubject) return null;
    const currentAttended = selectedSubject.attendedClasses;
    const currentTotal = selectedSubject.totalClasses;
    const target = targetPercentage / 100;

    // Consecutive classes needed to reach target:
    // (attended + x) / (total + x) >= target
    // x >= (target * total - attended) / (1 - target)
    let needed = 0;
    const currentPct = currentTotal > 0 ? (currentAttended / currentTotal) : 0;
    if (currentPct < target) {
      needed = Math.max(0, Math.ceil((target * currentTotal - currentAttended) / (1 - target)));
    }

    // Classes can safely leave without falling below target:
    // attended / (total + y) >= target
    // target * (total + y) <= attended
    // y <= (attended - target * total) / target
    let canLeave = 0;
    if (currentPct >= target) {
      canLeave = Math.max(0, Math.floor((currentAttended - target * currentTotal) / target));
    }

    // Simulated scenario
    const simTotal = currentTotal + simExtraAttended + simExtraMissed;
    const simAttended = currentAttended + simExtraAttended;
    const simPct = simTotal > 0 ? parseFloat(((simAttended / simTotal) * 100).toFixed(1)) : 0;

    return {
      currentAttended,
      currentTotal,
      currentPct: parseFloat((currentPct * 100).toFixed(1)),
      needed,
      canLeave,
      simTotal,
      simAttended,
      simPct,
      isSimSafe: simPct >= targetPercentage,
    };
  };

  const sim = calcSubjectStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance & 75% Compliance Engine"
        subtitle="Individual subject attendance tracking with mandatory 75% threshold and smart bunk / catch-up planner"
        breadcrumbs={['Student Portal', 'Attendance']}
      />

      {/* ─── Metric Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Percentage */}
        <div className="card p-5 border-brand-500/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Overall Attendance</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              attendance?.overallPercentage >= 75 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-danger-500/10 text-danger-500'
            }`}>
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[var(--text-primary)]">
            {attendance?.overallPercentage || 0}%
          </p>
          <div className="mt-2 w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                attendance?.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-danger-500'
              }`}
              style={{ width: `${Math.min(100, attendance?.overallPercentage || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Target: 75.0% Mandatory Threshold
          </p>
        </div>

        {/* 75% Mandatory Compliance */}
        <div className="card p-5 border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">75% Compliance Gate</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {!attendance?.hasShortage ? (
              <span className="text-emerald-600 dark:text-emerald-400">All Subjects Safe</span>
            ) : (
              <span className="text-amber-500">Shortage Detected</span>
            )}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
            {!attendance?.hasShortage
              ? 'Eligible to sit for end-semester examinations without penalty.'
              : 'Action needed: Attend upcoming lectures to prevent exam debarment.'}
          </p>
        </div>

        {/* Subjects in Good Standing */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Safe Subjects (≥ 75%)</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {subjects.filter(s => !s.isShortage).length} <span className="text-sm font-normal text-[var(--text-muted)]">/ {subjects.length}</span>
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Satisfying institutional attendance criteria</p>
        </div>

        {/* Shortage Subjects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shortage Subjects (&lt; 75%)</p>
            <div className="w-8 h-8 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-danger-600 dark:text-danger-400">
            {subjects.filter(s => s.isShortage).length}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Subjects requiring consecutive attendance recovery</p>
        </div>
      </div>

      {/* ─── Subject-Wise Breakdown Table ───────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Subject-Wise Attendance Ledger
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Accurate breakdown of total lectures conducted vs attended per course
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            Sem {attendance?.semester} · {attendance?.academicYear}
          </span>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Subject & Faculty</Th>
              <Th>Credits</Th>
              <Th>Conducted</Th>
              <Th>Attended</Th>
              <Th>Current %</Th>
              <Th>75% Status</Th>
              <Th>Recommendation & Margin</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 && <EmptyRow colSpan={7} message="No subject attendance records found" />}
            {subjects.map((sub, idx) => (
              <tr key={sub.subjectCode} className={idx === selectedSubIndex ? 'bg-brand-500/5' : ''}>
                <td>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{sub.subjectName}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{sub.subjectCode} · {sub.facultyName}</p>
                </td>
                <td className="text-xs font-mono font-medium">{sub.credits} Credits</td>
                <td className="text-sm font-mono">{sub.totalClasses}</td>
                <td className="text-sm font-mono font-semibold">{sub.attendedClasses}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-mono ${
                      sub.percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger-600 dark:text-danger-400'
                    }`}>
                      {sub.percentage}%
                    </span>
                  </div>
                </td>
                <td>
                  <Badge variant={sub.percentage >= 75 ? 'success' : 'danger'} dot>
                    {sub.percentage >= 75 ? 'Eligible (≥75%)' : 'Shortage (<75%)'}
                  </Badge>
                </td>
                <td>
                  {sub.percentage < 75 ? (
                    <div className="flex items-center gap-1.5 text-xs text-danger-600 dark:text-danger-400 font-medium">
                      <ArrowUpRight size={14} className="shrink-0" />
                      <span>Must attend next <strong>{sub.classesToAttendFor75}</strong> lectures</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Can safely leave <strong>{sub.classesCanBunkFor75}</strong> lectures</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ─── Smart 75% Attendance & Bunk Planning Calculator ───────── */}
      <div className="card p-6 border-brand-500/30 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-brand-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-color)] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/30">
              <Calculator size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                Smart 75% Attendance & Bunk Calculator
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  Interactive Simulator
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Calculate exactly how many upcoming lectures you must attend to cross 75%, or how many you can safely bunk without dropping below threshold
              </p>
            </div>
          </div>

          {/* Target Percentage Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Target:</span>
            {[75, 80, 85].map(pct => (
              <button
                key={pct}
                onClick={() => setTargetPercentage(pct)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  targetPercentage === pct
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Select Course / Subject
              </label>
              <select
                value={selectedSubIndex}
                onChange={(e) => {
                  setSelectedSubIndex(parseInt(e.target.value));
                  setSimExtraAttended(0);
                  setSimExtraMissed(0);
                }}
                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {subjects.map((s, idx) => (
                  <option key={s.subjectCode} value={idx}>
                    {s.subjectCode} — {s.subjectName} ({s.percentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Current Stats Box */}
            <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[var(--text-muted)]">Current Standing:</span>
                <span className={`text-sm font-bold font-mono ${
                  sim?.currentPct >= targetPercentage ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger-600 dark:text-danger-400'
                }`}>
                  {sim?.currentPct}% ({sim?.currentAttended} / {sim?.currentTotal} classes)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                <span>Faculty Instructor:</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedSubject?.facultyName}</span>
              </div>
            </div>

            {/* What-If Simulator Buttons */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Simulate Future Classes
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setSimExtraAttended(prev => prev + 1)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  + Attend 1 Class
                </button>
                <button
                  onClick={() => setSimExtraMissed(prev => prev + 1)}
                  className="py-2.5 px-3 rounded-xl bg-danger-500/10 text-danger-700 dark:text-danger-400 border border-danger-500/20 text-xs font-bold hover:bg-danger-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  + Miss / Leave 1
                </button>
              </div>

              {(simExtraAttended > 0 || simExtraMissed > 0) && (
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                  <span>Simulating: +{simExtraAttended} Attended, +{simExtraMissed} Missed</span>
                  <button
                    onClick={() => { setSimExtraAttended(0); setSimExtraMissed(0); }}
                    className="text-brand-500 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Results Dashboard */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Mathematical Analysis · Target {targetPercentage}%
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  sim?.currentPct >= targetPercentage
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/20'
                }`}>
                  {sim?.currentPct >= targetPercentage ? 'Criteria Met' : 'Action Required'}
                </span>
              </div>

              {/* Primary Output Cards */}
              {sim?.currentPct < targetPercentage ? (
                <div className="p-5 rounded-xl bg-danger-500/10 border border-danger-500/20 space-y-2 mb-4">
                  <p className="text-xs font-bold text-danger-700 dark:text-danger-300 uppercase tracking-wide">
                    ⚠️ Shortage Recovery Rule
                  </p>
                  <p className="text-xl font-extrabold text-danger-600 dark:text-danger-400">
                    You must attend the next <span className="underline decoration-2">{sim.needed}</span> consecutive lectures.
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Attending the next {sim.needed} classes will bring your attendance from {sim.currentPct}% to{' '}
                    <strong className="text-[var(--text-primary)]">
                      {(((sim.currentAttended + sim.needed) / (sim.currentTotal + sim.needed)) * 100).toFixed(1)}%
                    </strong>, satisfying the mandatory requirement.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 mb-4">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    ✅ Safe Margin / Bunk Capacity
                  </p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    You can safely miss <span className="underline decoration-2">{sim.canLeave}</span> upcoming lectures.
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Leaving {sim.canLeave} classes will lower your attendance to{' '}
                    <strong className="text-[var(--text-primary)]">
                      {((sim.currentAttended / (sim.currentTotal + sim.canLeave)) * 100).toFixed(1)}%
                    </strong>, keeping you safely above the {targetPercentage}% threshold.
                  </p>
                </div>
              )}

              {/* Simulated Outcome Display (When user clicked +1) */}
              {(simExtraAttended > 0 || simExtraMissed > 0) && (
                <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                  <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Simulated Projection:</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">
                      Projected attendance after {simExtraAttended + simExtraMissed} sessions:
                    </span>
                    <span className={`font-bold font-mono text-sm ${sim?.isSimSafe ? 'text-emerald-500' : 'text-danger-500'}`}>
                      {sim?.simPct}% ({sim?.simAttended} / {sim?.simTotal})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Statutory Disclaimer */}
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <HelpCircle size={13} className="shrink-0 text-brand-500" />
              <span>Institutional Rule 4.2: 75% individual subject attendance is mandatory for university examination hall tickets.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
