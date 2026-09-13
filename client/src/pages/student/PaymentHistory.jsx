import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Receipt, Download, Filter, ExternalLink, ShieldCheck, History, CheckCircle2 } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import SemesterSelector from '../../components/student/SemesterSelector.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

const methodBadge = {
  upi: 'brand', netbanking: 'info', card: 'success',
  offline_dd: 'warning', offline_challan: 'warning', offline_cash: 'neutral',
};

export default function PaymentHistory() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = {};
        if (semester) params.semester = semester;
        if (academicYear) params.academicYear = academicYear;
        const res = await api.get('/student/receipts', { params });
        setReceipts(res.data.data || []);
      } catch {
        toast.error('Failed to load receipts');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [semester, academicYear]);

  const totalPaidSum = receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const uniqueSemesters = [...new Set(receipts.map(r => r.semester))].sort((a, b) => a - b);
  const currentSem = user?.currentSemester || 1;
  const hasPastReceipts = receipts.some(r => r.semester < currentSem);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Payment History & Receipts"
        subtitle="Complete cryptographic ledger receipts for current and past academic semesters."
        breadcrumbs={['Student Portal', 'Payment History']}
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Total Settled</p>
            <h3 className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1 font-mono">
              {fmt(totalPaidSum)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-500/10 text-success-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Receipts Count</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {receipts.length} Official Record{receipts.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Receipt size={22} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Semesters Covered</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
              {uniqueSemesters.length > 0 ? `Sem ${uniqueSemesters.join(', ')}` : `Sem ${currentSem}`}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <History size={22} />
          </div>
        </Card>
      </div>

      {/* Notification banner for past semester records */}
      {hasPastReceipts && (
        <div className="p-3.5 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-950/20 flex items-center gap-3 text-xs text-brand-700 dark:text-brand-300">
          <ShieldCheck size={18} className="shrink-0 text-brand-500" />
          <span>
            <strong>Historical Records Active:</strong> You are currently in <strong>Semester {currentSem}</strong>. Your payment history includes verified historical payment receipts from past semesters as well as your active term.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4">
        <SemesterSelector
          selectedSemester={semester}
          selectedYear={academicYear}
          onSemesterChange={setSemester}
          onYearChange={setAcademicYear}
        />
      </div>

      {/* Receipts Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt size={16} className="text-brand-500" />
            <span>{receipts.length} Payment Receipt{receipts.length !== 1 ? 's' : ''} Documented</span>
          </h2>
        </div>

        {loading ? <PageSpinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Receipt No.</Th>
                <Th>Academic Term</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Date</Th>
                <Th>SHA-256 Checksum</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && <EmptyRow colSpan={8} message="No payment receipts found for the selected filter." />}
              {receipts.map((r) => {
                const isPast = r.semester < currentSem;
                return (
                  <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="font-mono text-xs font-semibold text-brand-500">{r.receiptNumber}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={isPast ? 'neutral' : 'brand'}>
                          Sem {r.semester}
                        </Badge>
                        {isPast && (
                          <span className="text-[10px] font-medium text-[var(--text-muted)] bg-slate-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">
                            Past Record
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-bold text-success-600 font-mono">{fmt(r.amountPaid)}</td>
                    <td>
                      <Badge variant={methodBadge[r.paymentMethod] || 'neutral'}>
                        {r.paymentMethod?.replace('_', ' ')?.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs text-[var(--text-muted)] max-w-[120px] truncate">{r.paymentReference || '—'}</td>
                    <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(r.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="font-mono text-xs text-[var(--text-muted)] max-w-[80px] truncate" title={r.sha256Hash}>
                      {r.sha256Hash?.slice(0, 12)}…
                    </td>
                    <td>
                      <Link
                        to={`/student/receipts/${r._id}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium py-1 px-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                      >
                        <ExternalLink size={13} /> View
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
