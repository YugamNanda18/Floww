import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Shield, Filter } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';
import { motion } from 'framer-motion';

const actionVariant = {
  waive_late_fee: 'warning', apply_scholarship: 'success', approve_offline_payment: 'info',
  reject_offline_payment: 'danger', create_fee_structure: 'brand', publish_fee_structure: 'brand',
  bulk_student_upload: 'neutral', semester_promotion: 'info', void_receipt: 'danger',
  create_late_fee_rule: 'warning', disburse_caution_money: 'success', manual_ledger_entry: 'neutral',
};

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'waive_late_fee', label: 'Waive Late Fee' },
  { value: 'apply_scholarship', label: 'Apply Scholarship' },
  { value: 'approve_offline_payment', label: 'Approve Offline Payment' },
  { value: 'create_fee_structure', label: 'Create Fee Structure' },
  { value: 'publish_fee_structure', label: 'Publish Fee Structure' },
  { value: 'bulk_student_upload', label: 'Bulk Student Upload' },
  { value: 'semester_promotion', label: 'Semester Promotion' },
  { value: 'disburse_caution_money', label: 'Disburse Caution Money' },
];

const fmt = (p) => p ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100) : null;

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/audit-trail', {
          params: { page, limit: 50, action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
        });
        setLogs(res.data.data);
        setTotal(res.data.total);
      } catch { toast.error('Failed to load audit trail'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [page, action, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Audit Trail"
        subtitle="Every admin override is recorded here permanently"
        breadcrumbs={['Admin', 'Audit Trail']}
      />

      {/* Info */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-sm">
        <Shield size={16} />
        <span>All entries are immutable. No record can be modified or deleted.</span>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <Select id="audit-action-filter" label="Action" value={action} onChange={(e) => setAction(e.target.value)} options={ACTIONS} className="w-52" />
          <Input id="audit-from" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input id="audit-to" label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-5">
        <p className="text-xs text-[var(--text-muted)] mb-3">{total} total records</p>
        {loading ? <PageSpinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Amount</Th>
                <Th>Reason</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && <EmptyRow colSpan={7} message="No audit records found" />}
              {logs.map((log) => (
                <React.Fragment key={log._id}>
                  <tr className="cursor-pointer" onClick={() => setExpanded(expanded === log._id ? null : log._id)}>
                    <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <p className="text-sm font-medium">{log.adminName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{log.adminEmail}</p>
                    </td>
                    <td><Badge variant={actionVariant[log.action] || 'neutral'}>{log.action?.replace(/_/g, ' ')}</Badge></td>
                    <td className="text-xs">{log.targetEntity}</td>
                    <td className="font-mono text-sm">{log.amountAffected > 0 ? fmt(log.amountAffected) : '—'}</td>
                    <td className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{log.reason}</td>
                    <td className="text-xs text-brand-500">{expanded === log._id ? '▲ Hide' : '▼ Show'}</td>
                  </tr>
                  {expanded === log._id && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-slate-50 dark:bg-surface-700 rounded-xl p-4 text-xs font-mono space-y-2"
                        >
                          {log.beforeState && (
                            <div>
                              <p className="text-danger-500 font-bold mb-1">BEFORE:</p>
                              <pre className="text-[var(--text-secondary)] overflow-auto">{JSON.stringify(log.beforeState, null, 2)}</pre>
                            </div>
                          )}
                          {log.afterState && (
                            <div>
                              <p className="text-success-600 font-bold mb-1">AFTER:</p>
                              <pre className="text-[var(--text-secondary)] overflow-auto">{JSON.stringify(log.afterState, null, 2)}</pre>
                            </div>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm btn">← Prev</button>
            <span className="text-sm text-[var(--text-muted)]">Page {page} of {Math.ceil(total / 50)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="btn-secondary btn-sm btn">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
