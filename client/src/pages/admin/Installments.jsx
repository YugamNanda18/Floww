import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Calendar, CheckCircle2, AlertCircle, Clock, Layers } from 'lucide-react';
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

export default function Installments() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Creation State
  const [students, setStudents] = useState([]);
  const [studentDemands, setStudentDemands] = useState([]);
  const [form, setForm] = useState({
    studentId: '',
    demandId: '',
    name: '3-Part Semester BNPL Schedule',
    numberOfInstallments: '3',
  });

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/installments');
      setPlans(res.data.data || []);
    } catch {
      toast.error('Failed to load installment plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data.data?.students || []);
    } catch { }
  };

  useEffect(() => {
    fetchPlans();
    fetchStudents();
  }, []);

  const handleStudentSelect = async (studentId) => {
    setForm(f => ({ ...f, studentId, demandId: '' }));
    if (!studentId) {
      setStudentDemands([]);
      return;
    }
    try {
      const res = await api.get('/admin/demands', { params: { studentId } });
      const demandsList = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.demands || []);
      const active = demandsList.filter(d => (d.student?._id === studentId || d.student === studentId || true) && d.status !== 'paid');
      setStudentDemands(active);
      if (active.length > 0) {
        setForm(f => ({ ...f, demandId: active[0]._id }));
      }
    } catch {
      toast.error('Failed to fetch student demands');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.demandId) {
      toast.error('Please select a student and an unpaid fee demand.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/admin/installments', {
        studentId: form.studentId,
        demandId: form.demandId,
        name: form.name,
        numberOfInstallments: parseInt(form.numberOfInstallments) || 3,
      });

      toast.success('Installment BNPL plan created successfully!');
      setShowModal(false);
      setForm({
        studentId: '',
        demandId: '',
        name: '3-Part Semester BNPL Schedule',
        numberOfInstallments: '3',
      });
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create installment plan');
    } finally {
      setProcessing(false);
    }
  };

  const statusVariant = { active: 'brand', completed: 'success', defaulted: 'danger', cancelled: 'neutral' };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installment Plans (BNPL)"
        subtitle="Configure flexible split payment schedules for semester fee liabilities"
        breadcrumbs={['Finance', 'Installment Plans']}
        actions={
          <Button
            id="create-installment-btn"
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Installment Plan
          </Button>
        }
      />

      <div className="card p-5">
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Plan Schedule</Th>
              <Th>Semester</Th>
              <Th>Total Plan Fee</Th>
              <Th>Paid So Far</Th>
              <Th>Installment Slots</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && <EmptyRow colSpan={7} message="No installment plans configured yet" />}
            {plans.map((plan) => (
              <tr key={plan._id}>
                <td>
                  <p className="font-medium text-sm text-[var(--text-primary)]">{plan.student?.name || 'Student'}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{plan.student?.rollNumber || '—'}</p>
                </td>
                <td className="text-sm font-medium">{plan.name}</td>
                <td><Badge variant="brand">{plan.demand?.semester ? `Sem ${plan.demand.semester}` : 'Regular'}</Badge></td>
                <td className="font-mono font-bold text-[var(--text-primary)]">{fmt(plan.totalAmount)}</td>
                <td className="font-mono text-success-600 font-bold">{fmt(plan.paidSoFar)}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.installments?.map((inst, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-lg font-mono flex items-center gap-1 border ${
                          inst.status === 'paid'
                            ? 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 border-success-500/20'
                            : inst.status === 'overdue'
                            ? 'bg-danger-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-400 border-danger-500/20'
                            : 'bg-slate-50 dark:bg-surface-700 text-slate-700 dark:text-slate-300 border-[var(--border-color)]'
                        }`}
                      >
                        Part {i + 1}: {fmt(inst.amount)} · Due {new Date(inst.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <Badge variant={statusVariant[plan.status] || 'neutral'} dot>
                    {plan.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Create Installment Plan Modal */}
      <Modal
        id="create-installment-modal"
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Student BNPL Installment Plan"
        size="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Select
            id="plan-student-select"
            label="Student"
            value={form.studentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            options={[
              { value: '', label: 'Select student...' },
              ...students.map(s => ({ value: s._id, label: `${s.name} (${s.rollNumber}) · Sem ${s.currentSemester}` })),
            ]}
            required
          />

          <Select
            id="plan-demand-select"
            label="Semester Fee Demand"
            value={form.demandId}
            onChange={(e) => setForm(f => ({ ...f, demandId: e.target.value }))}
            options={[
              { value: '', label: studentDemands.length === 0 ? 'Select a student first...' : 'Select active demand...' },
              ...studentDemands.map(d => ({
                value: d._id,
                label: `Sem ${d.semester} (${d.academicYear}) — Outstanding: ₹${(d.outstandingAmount / 100).toLocaleString('en-IN')}`,
              })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="plan-parts-select"
              label="Split Into"
              value={form.numberOfInstallments}
              onChange={(e) => {
                const parts = e.target.value;
                setForm(f => ({
                  ...f,
                  numberOfInstallments: parts,
                  name: `${parts}-Part Semester BNPL Schedule`,
                }));
              }}
              options={[
                { value: '2', label: '2 Monthly Parts (50% each)' },
                { value: '3', label: '3 Monthly Parts (33.3% each)' },
                { value: '4', label: '4 Monthly Parts (25% each)' },
              ]}
            />

            <Input
              id="plan-name-input"
              label="Plan Description"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Layers size={13} className="text-brand-500" /> Automated Schedule Generation
            </p>
            <p>
              The system divides the student's outstanding liability across the specified installments, automatically staggering maturity due dates in 30-day intervals.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button id="submit-installment-btn" variant="primary" type="submit" loading={processing}>
              Create Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
