import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IndianRupee, Users, AlertTriangle, TrendingUp, Receipt, CheckCircle, Clock, Activity, Shield, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Link } from 'react-router-dom';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((p || 0) / 100);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dashRes, revRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/reports/revenue'),
        ]);
        setData(dashRes.data.data);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        setRevenueData(revRes.data.data.map(d => ({
          name: `${months[d._id.month - 1]} ${d._id.year}`,
          revenue: d.revenue / 100,
          count: d.count,
        })));
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const kpis = [
    { label: 'Total Students', value: data.totalStudents, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: 'Total Collected', value: fmt(data.totalPaid), icon: IndianRupee, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
    { label: 'Outstanding', value: fmt(data.totalOutstanding), icon: Clock, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Overdue Demands', value: data.overdueCount, icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Collection Rate', value: `${data.collectionRate}%`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: 'Total Demands', value: data.totalDemands, icon: Activity, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10' },
  ];

  const methodColors = { upi: 'brand', netbanking: 'info', card: 'success', offline_dd: 'warning', offline_challan: 'warning' };

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Dashboard" subtitle="Institute financial overview" breadcrumbs={['Admin', 'Dashboard']} />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
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
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/students?status=defaulter" className="card p-4 hover:border-danger-500/50 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text-primary)]">Defaulter Watchlist</p>
              <p className="text-xs text-[var(--text-muted)]">Inspect & resolve overdue debts</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/add-student" className="card p-4 hover:border-brand-500/50 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text-primary)]">Add New Student</p>
              <p className="text-xs text-[var(--text-muted)]">Instant pipeline & ledger sync</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/staff" className="card p-4 hover:border-violet-500/50 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-[var(--text-primary)]">Main Admin Console</p>
                <span className="badge badge-brand text-[9px] px-1 py-0 font-mono">ADM001</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Add & manage Finance Admins</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/offline-payments" className="card p-4 hover:border-amber-500/50 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Receipt size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text-primary)]">Offline Reconciliation</p>
              <p className="text-xs text-[var(--text-muted)]">Verify Demand Drafts & Challans</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Monthly Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Transactions */}
      {data.recentTransactions?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Receipt size={16} /> Recent Transactions
            </h2>
            <Link to="/admin/ledger" className="text-xs text-brand-500 hover:text-brand-600">View Ledger →</Link>
          </div>
          <div className="space-y-2">
            {data.recentTransactions.map((txn) => (
              <div key={txn._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
                    <CheckCircle size={14} className="text-success-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{txn.student?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{txn.student?.rollNumber} · Sem {txn.demand?.semester}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success-600 text-sm">{fmt(txn.amount)}</p>
                  <Badge variant={methodColors[txn.method] || 'neutral'}>{txn.method}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
