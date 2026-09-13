import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { GraduationCap, Plus, Clock, ShieldCheck, Award, AlertCircle, Lock, Building2 } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { Table, Th, EmptyRow } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { motion } from 'framer-motion';

const fmt = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((p || 0) / 100);

export default function Scholarships() {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Apply Scholarship Modal
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [studentDemands, setStudentDemands] = useState([]);
  const [scholarshipForm, setScholarshipForm] = useState({
    studentId: '',
    demandId: '',
    amount: '',
    reason: 'Merit-Based Institutional Scholarship',
  });

  // Waive Late Fee Modal
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverDemands, setWaiverDemands] = useState([]);
  const [waiverForm, setWaiverForm] = useState({
    studentId: '',
    demandId: '',
    amount: '',
    reason: 'Academic Dean Discretionary Waiver',
  });

  const fetchData = async () => {
    try {
      const userDeptId = user?.department ? String(user.department._id || user.department) : null;
      const deptParam = userDeptId ? `&department=${userDeptId}` : '';

      const [demandsRes, studentsRes] = await Promise.all([
        api.get(`/admin/demands?limit=200${deptParam}`),
        api.get(`/admin/students?limit=200${deptParam}`),
      ]);

      const rawDemands = demandsRes.data.data;
      let allDemands = Array.isArray(rawDemands) ? rawDemands : (rawDemands?.demands || []);
      let allStudents = studentsRes.data.data?.students || [];

      // Strict department filtering for branch superuser
      if (userDeptId) {
        allStudents = allStudents.filter((s) => {
          const sDeptId = String(s.department?._id || s.department);
          return sDeptId === userDeptId;
        });

        allDemands = allDemands.filter((d) => {
          const sDeptId = String(d.student?.department?._id || d.student?.department);
          return sDeptId === userDeptId;
        });
      }

      setDemands(allDemands);
      setStudents(allStudents);
    } catch {
      toast.error('Failed to load scholarship and demand data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.department]);

  // Filter demands that have scholarships or late fee waivers
  const safeDemands = Array.isArray(demands) ? demands : [];
  const awardedDemands = safeDemands.filter(d => (d.scholarshipAmount && d.scholarshipAmount > 0));

  const handleScholarshipStudentSelect = async (studentId) => {
    setScholarshipForm(f => ({ ...f, studentId, demandId: '' }));
    if (!studentId) {
      setStudentDemands([]);
      return;
    }
    const studentDems = (Array.isArray(demands) ? demands : []).filter(d => (d.student?._id === studentId || d.student === studentId));
    setStudentDemands(studentDems);
    if (studentDems.length > 0) {
      setScholarshipForm(f => ({ ...f, demandId: studentDems[0]._id }));
    }
  };

  const handleWaiverStudentSelect = async (studentId) => {
    setWaiverForm(f => ({ ...f, studentId, demandId: '', amount: '' }));
    if (!studentId) {
      setWaiverDemands([]);
      return;
    }
    const penaltyDemands = (Array.isArray(demands) ? demands : []).filter(
      d => (d.student?._id === studentId || d.student === studentId) && (d.lateFeeAccrued && d.lateFeeAccrued > 0)
    );
    setWaiverDemands(penaltyDemands);
    if (penaltyDemands.length > 0) {
      const first = penaltyDemands[0];
      setWaiverForm(f => ({
        ...f,
        demandId: first._id,
        amount: (first.lateFeeAccrued / 100).toString(),
      }));
    }
  };

  const [activeTab, setActiveTab] = useState('scholarships'); // 'scholarships' | 'waivers'

  const handleApplyScholarship = async (e) => {
    e.preventDefault();
    if (!scholarshipForm.demandId) {
      toast.error('Please select a student and semester demand.');
      return;
    }
    const amtPaise = Math.round(parseFloat(scholarshipForm.amount || 0) * 100);
    if (amtPaise <= 0) {
      toast.error('Scholarship amount must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/scholarships/apply', {
        demandId: scholarshipForm.demandId,
        amount: amtPaise,
        reason: scholarshipForm.reason,
      });

      if (res.data?.data) {
        const updated = res.data.data;
        setDemands(prev => {
          const exists = prev.some(d => d._id === updated._id);
          if (exists) return prev.map(d => d._id === updated._id ? updated : d);
          return [updated, ...prev];
        });
      }

      toast.success('Scholarship granted! Double-entry ledger updated.');
      setShowScholarshipModal(false);
      setScholarshipForm({
        studentId: '',
        demandId: '',
        amount: '',
        reason: 'Merit-Based Institutional Scholarship',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply scholarship');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaiveLateFee = async (e) => {
    e.preventDefault();
    if (!waiverForm.demandId) {
      toast.error('Please select a student demand with accrued penalties.');
      return;
    }
    const amtPaise = Math.round(parseFloat(waiverForm.amount || 0) * 100);
    if (amtPaise <= 0) {
      toast.error('Waiver amount must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/waivers/late-fee', {
        demandId: waiverForm.demandId,
        amount: amtPaise,
        reason: waiverForm.reason,
      });

      if (res.data?.data) {
        const updated = res.data.data;
        setDemands(prev => {
          const exists = prev.some(d => d._id === updated._id);
          if (exists) return prev.map(d => d._id === updated._id ? updated : d);
          return [updated, ...prev];
        });
      }

      toast.success('Late fee penalty waived!');
      setShowWaiverModal(false);
      setWaiverForm({
        studentId: '',
        demandId: '',
        amount: '',
        reason: 'Academic Dean Discretionary Waiver',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Waiver failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  const waivedDemands = safeDemands.filter(d => (d.totalWaived && d.totalWaived > 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.department ? `${user.department.name || 'Branch'} Scholarships` : "Scholarships & Financial Overrides"}
        subtitle={
          user?.department
            ? `Strictly scoped to ${user.department.name} (${user.department.code}). Only students in your department are eligible.`
            : "Institutional Dean oversight: Manage merit bursaries, discretionary waivers, and statutory fee concessions."
        }
        breadcrumbs={['Superuser', 'Scholarships & Waivers']}
        actions={
          <div className="flex gap-2">
            <Button
              id="waive-late-fee-btn"
              variant="secondary"
              size="sm"
              onClick={() => setShowWaiverModal(true)}
              className="flex items-center gap-1.5"
            >
              <Clock size={14} /> Waive Late Fee
            </Button>
            <Button
              id="apply-scholarship-btn"
              variant="primary"
              size="sm"
              onClick={() => setShowScholarshipModal(true)}
              className="flex items-center gap-1.5"
            >
              <GraduationCap size={14} /> Grant Scholarship
            </Button>
          </div>
        }
      />

      {user?.department && (
        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/25 text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} />
            <span>🔒 <strong>Branch Isolated</strong>: You can only view and grant scholarships to <strong>{user.department.name} ({user.department.code})</strong> students.</span>
          </div>
          <Badge variant="brand">{students.length} Eligible Students</Badge>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 flex flex-col justify-between border-brand-500/20"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4">
              <Award size={24} />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">Institutional Scholarship Concession</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              Credits student receivable balance with institutional grant. Automatically posts an immutable journal:
              <br /><strong className="text-[var(--text-primary)]">DR Scholarship Expense</strong> / <strong className="text-[var(--text-primary)]">CR Student Fee Receivable</strong>.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowScholarshipModal(true)} className="w-full justify-center">
            Grant Scholarship
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 flex flex-col justify-between border-amber-500/20"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Clock size={24} />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">Late Fee Penalty Waiver</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              Forgive accrued late-fee penalties on overdue semester liabilities under executive discretionary powers.
              Requires mandatory rationale stored in permanent audit log.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowWaiverModal(true)} className="w-full justify-center">
            Waive Penalty
          </Button>
        </motion.div>
      </div>

      {/* Tabs & Table */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('scholarships')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'scholarships'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <GraduationCap size={15} /> Awarded Scholarships ({awardedDemands.length})
            </button>
            <button
              onClick={() => setActiveTab('waivers')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'waivers'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock size={15} /> Late Fee Waivers ({waivedDemands.length})
            </button>
          </div>
          <Button variant="ghost" size="xs" onClick={fetchData} className="text-xs">
            🔄 Refresh Records
          </Button>
        </div>

        {activeTab === 'scholarships' ? (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Semester</Th>
                <Th>Demanded Fee</Th>
                <Th>Scholarship Granted</Th>
                <Th>Net Payable Fee</Th>
                <Th>Outstanding Dues</Th>
                <Th>Category / Reason</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {awardedDemands.length === 0 && (
                <EmptyRow colSpan={8} message="No scholarships awarded yet. Click 'Apply Scholarship' to grant a bursary." />
              )}
              {awardedDemands.map((d) => (
                <tr key={d._id}>
                  <td>
                    <p className="font-medium text-sm text-[var(--text-primary)]">{d.student?.name || 'Student'}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{d.student?.rollNumber || ''}</p>
                  </td>
                  <td><Badge variant="brand">Sem {d.semester}</Badge></td>
                  <td className="font-mono text-xs">{fmt(d.totalDemanded)}</td>
                  <td className="font-bold font-mono text-violet-600 dark:text-violet-400">-{fmt(d.scholarshipAmount)}</td>
                  <td className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmt(d.totalDemanded - (d.scholarshipAmount || 0))}</td>
                  <td className="font-mono text-xs font-semibold text-[var(--text-primary)]">{fmt(d.outstandingAmount)}</td>
                  <td className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{d.scholarshipReason || 'Institutional Merit'}</td>
                  <td>
                    <Badge variant={d.status === 'paid' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'} dot>
                      {d.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Semester</Th>
                <Th>Total Demanded</Th>
                <Th>Waived Amount</Th>
                <Th>Remaining Outstanding</Th>
                <Th>Late Fee Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {waivedDemands.length === 0 && (
                <EmptyRow colSpan={7} message="No late fee penalties waived yet. Click 'Waive Late Fee' to grant a relief." />
              )}
              {waivedDemands.map((d) => (
                <tr key={d._id}>
                  <td>
                    <p className="font-medium text-sm text-[var(--text-primary)]">{d.student?.name || 'Student'}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{d.student?.rollNumber || ''}</p>
                  </td>
                  <td><Badge variant="brand">Sem {d.semester}</Badge></td>
                  <td className="font-mono text-xs">{fmt(d.totalDemanded)}</td>
                  <td className="font-bold font-mono text-amber-600 dark:text-amber-400">{fmt(d.totalWaived)}</td>
                  <td className="font-bold font-mono text-[var(--text-primary)]">{fmt(d.outstandingAmount)}</td>
                  <td className="font-mono text-xs text-danger-500 font-semibold">{fmt(d.lateFeeAccrued)}</td>
                  <td>
                    <Badge variant={d.status === 'paid' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'} dot>
                      {d.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* Apply Scholarship Modal */}
      <Modal
        id="scholarship-modal"
        open={showScholarshipModal}
        onClose={() => setShowScholarshipModal(false)}
        title="Apply Student Scholarship Concession"
        size="md"
      >
        <form onSubmit={handleApplyScholarship} className="space-y-4">
          <Select
            id="scholarship-student-select"
            label="Select Student"
            value={scholarshipForm.studentId}
            onChange={(e) => handleScholarshipStudentSelect(e.target.value)}
            options={[
              { value: '', label: 'Select student...' },
              ...students.map(s => ({ value: s._id, label: `${s.name} (${s.rollNumber}) · Sem ${s.currentSemester}` })),
            ]}
            required
          />

          <Select
            id="scholarship-demand-select"
            label="Fee Demand"
            value={scholarshipForm.demandId}
            onChange={(e) => setScholarshipForm(f => ({ ...f, demandId: e.target.value }))}
            options={[
              { value: '', label: studentDemands.length === 0 ? 'Select student first...' : 'Select demand...' },
              ...studentDemands.map(d => ({
                value: d._id,
                label: `Sem ${d.semester} (${d.academicYear}) — Demanded: ₹${(d.totalDemanded / 100).toLocaleString('en-IN')} · Outstanding: ₹${(d.outstandingAmount / 100).toLocaleString('en-IN')}`,
              })),
            ]}
            required
          />

          <Input
            id="scholarship-amount-input"
            label="Scholarship Concession (₹)"
            type="number"
            min="1"
            value={scholarshipForm.amount}
            onChange={(e) => setScholarshipForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 25000"
            required
          />

          <Input
            id="scholarship-reason-input"
            label="Scholarship Category / Justification"
            value={scholarshipForm.reason}
            onChange={(e) => setScholarshipForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Dean's Academic Merit Scholarship 2025"
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowScholarshipModal(false)} type="button">Cancel</Button>
            <Button id="submit-scholarship-btn" variant="primary" type="submit" loading={submitting}>
              Apply Concession
            </Button>
          </div>
        </form>
      </Modal>

      {/* Waive Late Fee Modal */}
      <Modal
        id="waiver-modal"
        open={showWaiverModal}
        onClose={() => setShowWaiverModal(false)}
        title="Waive Accrued Late Fee Penalty"
        size="md"
      >
        <form onSubmit={handleWaiveLateFee} className="space-y-4">
          <Select
            id="waiver-student-select"
            label="Select Student"
            value={waiverForm.studentId}
            onChange={(e) => handleWaiverStudentSelect(e.target.value)}
            options={[
              { value: '', label: 'Select student...' },
              ...students.map(s => ({ value: s._id, label: `${s.name} (${s.rollNumber}) · Sem ${s.currentSemester}` })),
            ]}
            required
          />

          <Select
            id="waiver-demand-select"
            label="Overdue Demand"
            value={waiverForm.demandId}
            onChange={(e) => {
              const d = waiverDemands.find(item => item._id === e.target.value);
              setWaiverForm(f => ({
                ...f,
                demandId: e.target.value,
                amount: d ? (d.lateFeeAccrued / 100).toString() : f.amount,
              }));
            }}
            options={[
              { value: '', label: waiverDemands.length === 0 ? 'No active penalties for this student' : 'Select overdue demand...' },
              ...waiverDemands.map(d => ({
                value: d._id,
                label: `Sem ${d.semester} — Accrued Late Fee: ₹${(d.lateFeeAccrued / 100).toLocaleString('en-IN')}`,
              })),
            ]}
            required
          />

          <Input
            id="waiver-amount-input"
            label="Amount to Waive (₹)"
            type="number"
            min="1"
            value={waiverForm.amount}
            onChange={(e) => setWaiverForm(f => ({ ...f, amount: e.target.value }))}
            required
          />

          <Input
            id="waiver-reason-input"
            label="Waiver Justification"
            value={waiverForm.reason}
            onChange={(e) => setWaiverForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Medical emergency verified by university health centre"
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowWaiverModal(false)} type="button">Cancel</Button>
            <Button id="submit-waiver-btn" variant="warning" type="submit" loading={submitting}>
              Waive Penalty
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
