import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Plus, Building, FileText, Banknote } from 'lucide-react';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

export default function OfflinePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [recordModal, setRecordModal] = useState(false);
  const [reason, setReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Record Offline Payment Form
  const [students, setStudents] = useState([]);
  const [studentDemands, setStudentDemands] = useState([]);
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    demandId: '',
    amount: '',
    method: 'offline_dd',
    refNumber: '',
    bankName: '',
    bankBranch: '',
  });

  const fetchPayments = async () => {
    try {
      const res = await api.get('/admin/offline-payments');
      setPayments(res.data.data || []);
    } catch {
      toast.error('Failed to load offline payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data.data?.students || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, []);

  const handleStudentSelect = async (studentId) => {
    setRecordForm(f => ({ ...f, studentId, demandId: '', amount: '' }));
    if (!studentId) {
      setStudentDemands([]);
      return;
    }
    try {
      const res = await api.get(`/admin/demands`, { params: { studentId } });
      const demandsList = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.demands || []);
      const activeDemands = demandsList.filter(d => (d.student?._id === studentId || d.student === studentId || true) && d.status !== 'paid');
      setStudentDemands(activeDemands);
      if (activeDemands.length > 0) {
        const first = activeDemands[0];
        const outstanding = (first.outstandingAmount + (first.lateFeeAccrued || 0)) / 100;
        setRecordForm(f => ({ ...f, demandId: first._id, amount: outstanding > 0 ? outstanding.toString() : '' }));
      }
    } catch {
      toast.error('Failed to load student demands');
    }
  };

  const handleDemandSelect = (demandId) => {
    const demand = studentDemands.find(d => d._id === demandId);
    setRecordForm(f => ({
      ...f,
      demandId,
      amount: demand ? ((demand.outstandingAmount + (demand.lateFeeAccrued || 0)) / 100).toString() : f.amount,
    }));
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!recordForm.studentId || !recordForm.demandId) {
      toast.error('Please select both a student and their fee demand.');
      return;
    }
    const amtPaise = Math.round(parseFloat(recordForm.amount || 0) * 100);
    if (amtPaise <= 0) {
      toast.error('Payment amount must be greater than 0.');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/admin/offline-payments', {
        studentId: recordForm.studentId,
        demandId: recordForm.demandId,
        amount: amtPaise,
        method: recordForm.method,
        offlineDetails: {
          ddNumber: recordForm.method === 'offline_dd' ? recordForm.refNumber : undefined,
          challanNo: recordForm.method === 'offline_challan' ? recordForm.refNumber : undefined,
          bankName: recordForm.bankName,
          bankBranch: recordForm.bankBranch,
        },
      });

      toast.success('Offline payment recorded! Awaiting approval.');
      setRecordModal(false);
      setRecordForm({
        studentId: '',
        demandId: '',
        amount: '',
        method: 'offline_dd',
        refNumber: '',
        bankName: '',
        bankBranch: '',
      });
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/offline-payments/${selected._id}/approve`, { reason });
      toast.success('Payment approved! Ledger updated and receipt issued.');
      setApproveModal(false);
      setSelected(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/offline-payments/${rejectTargetId}/reject`, { reason: rejectReason || 'Payment rejected by administrator' });
      toast.success('Payment rejected.');
      setRejectModal(false);
      setRejectTargetId(null);
      setRejectReason('');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const statusVariant = { captured: 'success', pending_approval: 'warning', failed: 'danger', created: 'neutral' };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offline Payment Reconciliation"
        subtitle="Record, verify, and approve Demand Drafts, Bank Challans, and Counter Cash"
        breadcrumbs={['Finance', 'Offline Payments']}
        actions={
          <Button
            id="record-offline-btn"
            variant="primary"
            size="sm"
            onClick={() => setRecordModal(true)}
            className="flex items-center gap-1.5"
          >
            <Plus size={14} /> Record Offline Payment
          </Button>
        }
      />

      <div className="card p-5">
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Semester</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Reference / DD</Th>
              <Th>Bank / Branch</Th>
              <Th>Recorded Date</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && <EmptyRow colSpan={9} message="No offline payments recorded yet" />}
            {payments.map((p) => (
              <tr key={p._id}>
                <td>
                  <p className="font-medium text-sm text-[var(--text-primary)]">{p.student?.name || 'Student'}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{p.student?.rollNumber || '—'}</p>
                </td>
                <td><Badge variant="brand">{p.demand?.semester ? `Sem ${p.demand.semester}` : 'Regular'}</Badge></td>
                <td className="font-bold font-mono text-[var(--text-primary)]">{fmt(p.amount)}</td>
                <td>
                  <Badge variant="warning">
                    {p.method?.replace('offline_', '').toUpperCase()}
                  </Badge>
                </td>
                <td className="font-mono text-xs text-[var(--text-secondary)]">
                  {p.offlineDetails?.ddNumber || p.offlineDetails?.challanNo || '—'}
                </td>
                <td className="text-xs text-[var(--text-secondary)]">
                  {p.offlineDetails?.bankName ? `${p.offlineDetails.bankName} (${p.offlineDetails.bankBranch || 'Main'})` : 'Campus Counter'}
                </td>
                <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td><Badge variant={statusVariant[p.status] || 'neutral'} dot>{p.status}</Badge></td>
                <td>
                  {p.status === 'pending_approval' && (
                    <div className="flex gap-1.5">
                      <Button
                        id={`approve-btn-${p._id}`}
                        size="xs"
                        variant="success"
                        onClick={() => { setSelected(p); setApproveModal(true); }}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <CheckCircle size={11} /> Approve
                      </Button>
                      <Button
                        id={`reject-btn-${p._id}`}
                        size="xs"
                        variant="danger"
                        onClick={() => { setRejectTargetId(p._id); setRejectModal(true); }}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <XCircle size={11} /> Reject
                      </Button>
                    </div>
                  )}
                  {p.status === 'captured' && (
                    <Badge variant="success"><CheckCircle size={10} /> Verified & Settled</Badge>
                  )}
                  {p.status === 'failed' && (
                    <Badge variant="danger"><XCircle size={10} /> Rejected</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Record Offline Payment Modal */}
      <Modal
        id="record-modal"
        open={recordModal}
        onClose={() => setRecordModal(false)}
        title="Record Physical Offline Payment"
        size="md"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          <Select
            id="student-select"
            label="Select Student"
            value={recordForm.studentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            options={[
              { value: '', label: 'Select student...' },
              ...students.map(s => ({ value: s._id, label: `${s.name} (${s.rollNumber}) · Sem ${s.currentSemester}` })),
            ]}
            required
          />

          <Select
            id="demand-select"
            label="Fee Demand"
            value={recordForm.demandId}
            onChange={(e) => handleDemandSelect(e.target.value)}
            options={[
              { value: '', label: studentDemands.length === 0 ? 'Select a student first...' : 'Select fee demand...' },
              ...studentDemands.map(d => ({
                value: d._id,
                label: `Sem ${d.semester} (${d.academicYear}) — Due: ₹${((d.outstandingAmount + (d.lateFeeAccrued || 0)) / 100).toLocaleString('en-IN')} [Status: ${d.status}]`,
              })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="payment-method-select"
              label="Instrument / Method"
              value={recordForm.method}
              onChange={(e) => setRecordForm(f => ({ ...f, method: e.target.value }))}
              options={[
                { value: 'offline_dd', label: 'Demand Draft (DD)' },
                { value: 'offline_challan', label: 'Bank Challan' },
                { value: 'offline_cash', label: 'Physical Cash' },
              ]}
            />

            <Input
              id="payment-amount-input"
              label="Amount (₹)"
              type="number"
              min="1"
              value={recordForm.amount}
              onChange={(e) => setRecordForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 50000"
              required
            />
          </div>

          <Input
            id="ref-number-input"
            label={recordForm.method === 'offline_dd' ? 'DD Number' : recordForm.method === 'offline_challan' ? 'Challan Reference Number' : 'Cash Receipt Voucher No.'}
            value={recordForm.refNumber}
            onChange={(e) => setRecordForm(f => ({ ...f, refNumber: e.target.value }))}
            placeholder="e.g. DD-84729103"
            required
          />

          {recordForm.method !== 'offline_cash' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="bank-name-input"
                label="Bank Name"
                value={recordForm.bankName}
                onChange={(e) => setRecordForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. State Bank of India"
                required
              />
              <Input
                id="bank-branch-input"
                label="Branch"
                value={recordForm.bankBranch}
                onChange={(e) => setRecordForm(f => ({ ...f, bankBranch: e.target.value }))}
                placeholder="e.g. University Campus Branch"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setRecordModal(false)} type="button">Cancel</Button>
            <Button id="submit-record-offline-btn" variant="primary" type="submit" loading={processing}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approve Payment Modal */}
      <Modal id="approve-modal" open={approveModal} onClose={() => setApproveModal(false)} title="Approve Offline Payment">
        {selected && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] text-sm space-y-1.5">
              <p><strong>Student:</strong> {selected.student?.name} ({selected.student?.rollNumber})</p>
              <p><strong>Amount:</strong> <span className="font-bold text-success-600 font-mono">{fmt(selected.amount)}</span></p>
              <p><strong>Instrument:</strong> {selected.method?.replace('offline_', '').toUpperCase()}</p>
              <p><strong>Reference:</strong> <span className="font-mono">{selected.offlineDetails?.ddNumber || selected.offlineDetails?.challanNo || 'N/A'}</span></p>
              <p><strong>Bank:</strong> {selected.offlineDetails?.bankName || 'Campus Treasury'}</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Approving posts immutable double-entry ledger journals (DR Bank/Cash, CR Fee Receivable)
              and generates a SHA-256 verified digital receipt.
            </p>
            <Input
              id="approve-reason"
              label="Verification Remarks"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bank statement confirmed, DD cleared..."
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button variant="secondary" onClick={() => setApproveModal(false)}>Cancel</Button>
              <Button id="confirm-approve-btn" variant="success" loading={processing} onClick={handleApprove}>
                <CheckCircle size={14} /> Confirm Approval
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Payment Modal */}
      <Modal id="reject-modal" open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Offline Payment">
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Please provide a reason for rejecting this offline payment submission. This reason will be permanently recorded in the audit trail.
          </p>
          <Input
            id="reject-reason"
            label="Rejection Justification"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Signature mismatch, DD dishonored by bank..."
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button id="confirm-reject-btn" variant="danger" loading={processing} onClick={handleReject}>
              <XCircle size={14} /> Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
