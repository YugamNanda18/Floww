import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { IndianRupee, Users, TrendingUp, Target, Building2, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format((p || 0) / 100);
const fmtFull = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((p || 0) / 100);

const DEPT_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#ec4899', '#6366f1'];

export default function SuperDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/superuser/analytics');
        setData(res.data.data);
      } catch { toast.error('Failed to load analytics'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const { kpis, deptStats, monthlyRevenue, scope } = data;

  const isBranchScoped = Boolean(scope?.isBranchScoped || (user?.department && user?.employeeId !== 'SUP001' && user?.email !== 'super@demo.com'));
  const branchName = scope?.departmentName || user?.department?.name || 'Department';
  const branchCode = scope?.departmentCode || user?.department?.code || 'BRANCH';

  const radialData = deptStats?.map((d, i) => ({
    name: d.name || 'Unknown',
    value: d.totalDemanded > 0 ? Math.round((d.totalPaid / d.totalDemanded) * 100) : 0,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  })) || [];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = monthlyRevenue?.map(d => ({
    name: `${months[d._id.month - 1]} ${d._id.year}`,
    revenue: d.revenue / 100,
  })) || [];

  const heroKpis = [
    { label: isBranchScoped ? 'Branch Students' : 'Total Students', value: kpis.totalStudents, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: isBranchScoped ? 'Branch Revenue' : 'Total Revenue', value: fmt(kpis.totalRevenue), icon: IndianRupee, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
    { label: isBranchScoped ? 'Branch Target' : 'Projected Revenue', value: fmt(kpis.projectedRevenue), icon: Target, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10' },
    { label: 'Collection Rate', value: `${kpis.collectionRate}%`, icon: TrendingUp, color: kpis.collectionRate >= 80 ? 'text-success-500' : 'text-warning-500', bg: kpis.collectionRate >= 80 ? 'bg-success-50 dark:bg-success-500/10' : 'bg-warning-50 dark:bg-warning-500/10' },
    { label: isBranchScoped ? 'Branch Outstanding' : 'Outstanding', value: fmt(kpis.totalOutstanding), icon: Activity, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    isBranchScoped
      ? { label: 'Assigned Branch', value: branchCode, icon: Building2, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10' }
      : { label: 'Departments', value: deptStats?.length || 0, icon: Building2, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isBranchScoped ? `${branchName} Analytics` : 'Institute Analytics'}
        subtitle={
          isBranchScoped
            ? `Real-time academic & financial intelligence for ${branchName} (${branchCode})`
            : 'Real-time financial intelligence dashboard across all academic departments'
        }
        breadcrumbs={['Superuser', isBranchScoped ? branchCode : 'All Departments', 'Analytics']}
      />

      {/* Scope Active Governance Banner */}
      {isBranchScoped ? (
        <div className="card p-4 bg-brand-500/10 border border-brand-500/25 flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-600 font-bold">
              {branchCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Department Branch Scope Active: {branchName}
                </h3>
                <span className="badge badge-brand text-[11px] font-semibold">Branch Scoped</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Displaying departmental analytics, fee collection rate, student enrollments, and monthly streams exclusively for {branchName} ({branchCode}).
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-[var(--text-muted)] block">Logged In Superuser</span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">{user?.name || 'Department Head'}</span>
          </div>
        </div>
      ) : (
        <div className="card p-3.5 bg-gradient-to-r from-brand-500/5 to-indigo-500/5 border border-brand-500/20 flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Master Institutional Dean Scope (All Departments Unified)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Centralized institute-wide metrics across all branches (CSE, ECE, ME, CE), fee collections, and forecasting.
              </p>
            </div>
          </div>
          <span className="badge badge-brand text-[11px] font-semibold">SUP001 Master Dean</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {heroKpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{k.label}</p>
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.icon size={18} className={k.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${k.color}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Collection Rate Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {isBranchScoped ? `${branchCode} Fee Collection Rate` : 'Overall Institute Collection Rate'}
          </h2>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Target: 100% Demand Realization
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-slate-100 dark:bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${kpis.collectionRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${kpis.collectionRate >= 80 ? 'bg-gradient-success' : kpis.collectionRate >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-danger'}`}
            />
          </div>
          <span className="text-2xl font-bold text-[var(--text-primary)]">{kpis.collectionRate}%</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Collected: {fmtFull(kpis.totalRevenue)} of {fmtFull(kpis.projectedRevenue)} projected {isBranchScoped ? `for ${branchCode}` : 'across all departments'}
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department collection gauges */}
        {radialData.length > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              {isBranchScoped ? `${branchCode} Collection Progress` : 'Department-wise Collection %'}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart innerRadius="20%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Collection']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {radialData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  <span className="text-xs text-[var(--text-secondary)]">{d.name}: {d.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Monthly revenue chart */}
        {chartData.length > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              {isBranchScoped ? `${branchCode} Monthly Revenue Trends` : 'Monthly Revenue Overview'}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="superRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#superRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Dept stats table */}
      {deptStats?.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            {isBranchScoped ? `${branchName} Department Performance Breakdown` : 'Department-wise Performance'}
          </h2>
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Students</th>
                  <th>Demanded</th>
                  <th>Collected</th>
                  <th>Outstanding</th>
                  <th>Collection %</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.map((d, i) => {
                  const rate = d.totalDemanded > 0 ? Math.round((d.totalPaid / d.totalDemanded) * 100) : 0;
                  return (
                    <tr key={d._id || i}>
                      <td className="font-medium">{d.name || 'Unknown'}</td>
                      <td>{d.studentCount}</td>
                      <td className="font-mono">{fmtFull(d.totalDemanded)}</td>
                      <td className="font-mono text-success-600">{fmtFull(d.totalPaid)}</td>
                      <td className="font-mono text-warning-500">{fmtFull(d.totalOutstanding)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-medium">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

