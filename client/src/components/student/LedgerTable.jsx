import React from 'react';
import { Link } from 'react-router-dom';
import { Table, Th, EmptyRow } from '../ui/Table.jsx';
import Badge from '../ui/Badge.jsx';
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function LedgerTable({ entries = [] }) {
  const { user } = useAuth();
  const currentSem = user?.currentSemester || 1;

  return (
    <Table>
      <thead>
        <tr>
          <Th>Type</Th>
          <Th>Account</Th>
          <Th>Narration</Th>
          <Th>Semester</Th>
          <Th>Date & Time</Th>
          <Th>Debit (DR)</Th>
          <Th>Credit (CR)</Th>
          <Th>Receipt</Th>
        </tr>
      </thead>
      <tbody>
        {entries.length === 0 && <EmptyRow colSpan={8} message="No ledger entries found." />}
        {entries.map((entry) => {
          const entrySem = entry.relatedDemand?.semester;
          const isPast = entrySem && entrySem < currentSem;

          return (
            <tr key={entry._id}>
              <td>
                <div className="flex items-center gap-1.5">
                  {entry.type === 'debit' ? (
                    <div className="w-6 h-6 rounded-full bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center">
                      <ArrowUpRight size={12} className="text-danger-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
                      <ArrowDownLeft size={12} className="text-success-500" />
                    </div>
                  )}
                  <span className={`text-xs font-semibold uppercase ${entry.type === 'debit' ? 'text-danger-500' : 'text-success-600'}`}>
                    {entry.type}
                  </span>
                </div>
              </td>
              <td className="font-medium text-xs text-[var(--text-primary)]">{entry.account}</td>
              <td className="text-[var(--text-secondary)] text-xs max-w-[220px] truncate" title={entry.narration}>
                {entry.narration}
              </td>
              <td>
                {entrySem ? (
                  <div className="flex items-center gap-1">
                    <Badge variant={isPast ? 'neutral' : 'brand'}>
                      Sem {entrySem}
                    </Badge>
                    {isPast && (
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">Past</span>
                    )}
                  </div>
                ) : '—'}
              </td>
              <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">{fmtDate(entry.postedAt)}</td>
              <td className={`font-mono font-semibold text-sm ${entry.type === 'debit' ? 'text-danger-500' : 'text-[var(--text-muted)]'}`}>
                {entry.type === 'debit' ? fmt(entry.amount) : '—'}
              </td>
              <td className={`font-mono font-semibold text-sm ${entry.type === 'credit' ? 'text-success-600' : 'text-[var(--text-muted)]'}`}>
                {entry.type === 'credit' ? fmt(entry.amount) : '—'}
              </td>
              <td>
                {entry.relatedTransaction ? (
                  <Link
                    to={`/student/receipts/${entry.relatedTransaction?._id || entry.relatedTransaction}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium py-1 px-1.5 rounded hover:bg-brand-50 dark:hover:bg-brand-500/10"
                    title="View Cryptographic Receipt"
                  >
                    <ExternalLink size={14} />
                    <span className="text-[11px]">View</span>
                  </Link>
                ) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
