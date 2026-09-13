import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Vault, Send } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

export default function CautionMoneyPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disbursing, setDisbursing] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/admin/caution-money');
        setRecords(res.data.data);
      } catch { toast.error('Failed to load caution money records'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDisburse = async () => {
    if (selected.length === 0) { toast.error('Select students to disburse'); return; }
    setDisbursing(true);
    try {
      const res = await api.post('/admin/caution-money/disburse', {
        studentIds: selected,
        reason: 'Graduation disbursement',
      });
      toast.success(`Disbursed ${res.data.data.length} caution money records!`);
      setSelected([]);
      const refetch = await api.get('/admin/caution-money');
      setRecords(refetch.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Disbursement failed');
    } finally {
      setDisbursing(false);
    }
  };

  const held = records.filter(r => r.status === 'held');
  const totalHeld = held.reduce((s, r) => s + r.depositAmount, 0);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caution Money Ledger"
        subtitle="Track deposits and manage graduation disbursements"
        breadcrumbs={['Admin', 'Caution Money']}
        actions={
          selected.length > 0 && (
            <Button id="disburse-btn" variant="success" size="sm" loading={disbursing} onClick={handleDisburse}>
              <Send size={14} /> Disburse {selected.length} Selected
            </Button>
          )
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Held', value: fmt(totalHeld), color: 'text-warning-500' },
          { label: 'Students with Deposit', value: held.length, color: 'text-brand-500' },
          { label: 'Total Refunded', value: fmt(records.filter(r => r.status === 'refunded').reduce((s, r) => s + r.refundAmount, 0)), color: 'text-success-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <Table>
          <thead>
            <tr>
              <Th>
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selected.length === held.filter(r => r.student).length && held.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? held.map(r => r.student?._id).filter(Boolean) : [])}
                />
              </Th>
              <Th>Student</Th>
              <Th>Deposit Amount</Th>
              <Th>Deposit Date</Th>
              <Th>Status</Th>
              <Th>Refund Amount</Th>
              <Th>Refund Date</Th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && <EmptyRow colSpan={7} message="No caution money records" />}
            {records.map((r) => (
              <tr key={r._id}>
                <td>
                  {r.status === 'held' && r.student && (
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.includes(r.student?._id)}
                      onChange={(e) => {
                        const sid = r.student?._id;
                        if (!sid) return;
                        setSelected(prev => e.target.checked ? [...prev, sid] : prev.filter(s => s !== sid));
                      }}
                    />
                  )}
                </td>
                <td>
                  <p className="font-medium text-sm text-[var(--text-primary)]">{r.student?.name || 'Unknown Student'}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{r.student?.rollNumber || '—'}</p>
                </td>
                <td className="font-bold font-mono text-[var(--text-primary)]">{fmt(r.depositAmount)}</td>
                <td className="text-xs text-[var(--text-muted)]">{new Date(r.depositDate).toLocaleDateString('en-IN')}</td>
                <td>
                  <Badge variant={r.status === 'held' ? 'warning' : r.status === 'refunded' ? 'success' : 'danger'} dot>
                    {r.status === 'held' ? 'Escrow Held' : r.status === 'refunded' ? 'Refunded (Paid Back)' : r.status}
                  </Badge>
                </td>
                <td className="font-mono text-success-600">{r.refundAmount > 0 ? fmt(r.refundAmount) : '—'}</td>
                <td className="text-xs text-[var(--text-muted)]">{r.refundDate ? new Date(r.refundDate).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
