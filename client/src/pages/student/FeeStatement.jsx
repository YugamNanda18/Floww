import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookOpen, ShieldCheck, History, ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import SemesterSelector from '../../components/student/SemesterSelector.jsx';
import LedgerTable from '../../components/student/LedgerTable.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';

export default function FeeStatement() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (semester) params.semester = semester;
      const res = await api.get('/ledger/my', { params });
      setEntries(res.data.data || []);
    } catch {
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, [semester, academicYear]);

  const totalDebit = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredit = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const netOutstanding = Math.max(0, totalDebit - totalCredit);
  const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

  const currentSem = user?.currentSemester || 1;
  const pastEntriesCount = entries.filter(e => e.relatedDemand?.semester && e.relatedDemand.semester < currentSem).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Official Fee Statement & Ledger"
        subtitle="Complete double-entry accounting ledger of all fee assessments, adjustments, and settlements."
        breadcrumbs={['Student Portal', 'Fee Statement']}
      />

      {/* Historical Ledger Notice */}
      {currentSem > 1 && (
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center gap-3 text-xs text-indigo-800 dark:text-indigo-300">
          <History size={18} className="shrink-0 text-indigo-500" />
          <span>
            <strong>Multi-Semester Ledger Active:</strong> You are in <strong>Semester {currentSem}</strong>. Your statement includes all historical ledger postings from prior semesters (Semesters 1 to {currentSem - 1}) along with your current semester demands.
          </span>
        </div>
      )}

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Total Debits (Assessed)</p>
            <h3 className="text-2xl font-bold text-danger-500 mt-1 font-mono">{fmt(totalDebit)}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Cumulative fee assessments</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-500 flex items-center justify-center">
            <ArrowUpRight size={22} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Total Credits (Paid/Settled)</p>
            <h3 className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1 font-mono">{fmt(totalCredit)}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Verified settlements & credits</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-500/10 text-success-600 flex items-center justify-center">
            <ArrowDownRight size={22} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Net Outstanding Balance</p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${netOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-brand-500'}`}>
              {fmt(netOutstanding)}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {netOutstanding === 0 ? 'All historical & current dues cleared' : 'Current active dues payable'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Scale size={22} />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <SemesterSelector
          selectedSemester={semester}
          selectedYear={academicYear}
          onSemesterChange={setSemester}
          onYearChange={setAcademicYear}
        />
      </div>

      {/* Ledger Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Double-Entry Journal Postings ({entries.length} Entries)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Immutable journal entries with strict DR/CR balance
            </p>
          </div>
        </div>

        {loading ? <PageSpinner /> : <LedgerTable entries={entries} />}
      </div>
    </div>
  );
}
