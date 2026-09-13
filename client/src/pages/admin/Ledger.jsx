import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

const ACCOUNTS = [
  { value: '', label: 'All Accounts' },
  { value: 'Bank / Cash', label: 'Bank / Cash' },
  { value: 'Student Fee Receivable', label: 'Student Fee Receivable' },
  { value: 'Late Fee Receivable', label: 'Late Fee Receivable' },
  { value: 'Late Fee Income', label: 'Late Fee Income' },
  { value: 'Scholarship Expense', label: 'Scholarship Expense' },
  { value: 'Caution Money Liability', label: 'Caution Money Liability' },
  { value: 'Refund Payable', label: 'Refund Payable' },
];

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [account, setAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ledger', { params: { page, limit: 50, account: account || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } });
      setEntries(res.data.entries);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [page, account, dateFrom, dateTo]);

  const totalDebits = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredits = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Double-Entry Ledger" subtitle="Immutable journal of all financial entries" breadcrumbs={['Admin', 'Ledger']} />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Select
            id="ledger-account-filter"
            label="Account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            options={ACCOUNTS}
            className="w-52"
          />
          <Input id="ledger-from" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input id="ledger-to" label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Debits (Page)', value: fmt(totalDebits), color: 'text-danger-500' },
          { label: 'Total Credits (Page)', value: fmt(totalCredits), color: 'text-success-600' },
          { label: 'Total Records', value: total, color: 'text-brand-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      <div className="card p-5">
        {loading ? <PageSpinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Journal ID</Th>
                <Th>Account</Th>
                <Th>Student</Th>
                <Th>Narration</Th>
                <Th>Posted By</Th>
                <Th>Date</Th>
                <Th>Debit (₹)</Th>
                <Th>Credit (₹)</Th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <EmptyRow colSpan={9} />}
              {entries.map((e) => (
                <tr key={e._id}>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {e.type === 'debit' ? (
                        <ArrowUpRight size={13} className="text-danger-500" />
                      ) : (
                        <ArrowDownLeft size={13} className="text-success-500" />
                      )}
                      <span className={`text-xs font-semibold uppercase ${e.type === 'debit' ? 'text-danger-500' : 'text-success-600'}`}>{e.type}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-[var(--text-muted)]">{e.journalId?.slice(0, 8)}…</td>
                  <td className="text-xs font-medium max-w-[150px] truncate">{e.account}</td>
                  <td className="text-xs">{e.relatedStudent?.name || '—'}</td>
                  <td className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{e.narration}</td>
                  <td className="text-xs text-[var(--text-muted)]">{e.postedByLabel}</td>
                  <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(e.postedAt).toLocaleDateString('en-IN')}</td>
                  <td className={`font-mono text-sm font-semibold ${e.type === 'debit' ? 'text-danger-500' : 'text-[var(--text-muted)]'}`}>
                    {e.type === 'debit' ? fmt(e.amount) : '—'}
                  </td>
                  <td className={`font-mono text-sm font-semibold ${e.type === 'credit' ? 'text-success-600' : 'text-[var(--text-muted)]'}`}>
                    {e.type === 'credit' ? fmt(e.amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
            <button id="prev-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm btn">
              ← Prev
            </button>
            <span className="text-sm text-[var(--text-muted)]">Page {page} of {Math.ceil(total / 50)}</span>
            <button id="next-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="btn-secondary btn-sm btn">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
