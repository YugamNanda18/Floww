import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Calendar,
  IndianRupee,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  UserCheck
} from 'lucide-react';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

export default function Demands() {
  const [demands, setDemands] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    studentId: '',
    feeStructureId: '',
    dueDate: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchFeeStructures(), fetchAllStudents()]);
  }, []);

  useEffect(() => {
    fetchDemands();
  }, [selectedDept, selectedSem, selectedStatus, search]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      setDepartments(res.data.data || []);
    } catch {}
  };

  const fetchFeeStructures = async () => {
    try {
      const res = await api.get('/admin/fee-structures');
      setFeeStructures(res.data.data || []);
    } catch {}
  };

  const fetchAllStudents = async () => {
    try {
      const res = await api.get('/admin/students?limit=200');
      setAllStudents(res.data.data?.students || []);
    } catch {}
  };

  const fetchDemands = async () => {
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedSem) params.semester = selectedSem;
      if (selectedStatus) params.status = selectedStatus;
      if (search) params.search = search;

      const res = await api.get('/admin/demands', { params });
      setDemands(res.data.data?.demands || []);
    } catch (err) {
      toast.error('Failed to load demands.');
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDemand = async (e) => {
    e.preventDefault();
    if (!modalForm.studentId || !modalForm.feeStructureId) {
      toast.error('Please select both a student and a fee structure.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/demands/raise', modalForm);
      toast.success('Fee demand raised and posted to institutional ledger!');
      setShowCreateModal(false);
      setModalForm({ studentId: '', feeStructureId: '', dueDate: '', reason: '' });
      fetchDemands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise demand.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !demands.length) return <PageSpinner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Fee Demands & Assessments"
          subtitle="Institute-wide receivable demands generated across departments, batches, and semesters."
          breadcrumbs={['Finance Admin', 'Demands']}
        />
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Plus size={16} /> Raise Individual Demand
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Department Filter */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input text-xs py-2 w-full"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">Semester</label>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="input text-xs py-2 w-full"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input text-xs py-2 w-full"
            >
              <option value="">All Statuses</option>
              <option value="overdue">Overdue / Defaulter</option>
              <option value="partial">Partially Paid</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">Search Student</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name or Roll No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-8 py-2 text-xs w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Demands Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                <th className="p-4">Student</th>
                <th className="p-4">Sem & Academic Year</th>
                <th className="p-4 text-right">Demanded</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Outstanding</th>
                <th className="p-4 text-right">Late Fee</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {demands.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No demands match the selected criteria.
                  </td>
                </tr>
              ) : (
                demands.map((d) => {
                  const isOverdue = d.status === 'overdue';
                  return (
                    <tr key={d._id} className="hover:bg-[var(--bg-base)]/60 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-[var(--text-primary)]">{d.student?.name || 'Unknown'}</div>
                        <div className="text-[var(--text-muted)] text-[11px] font-mono">
                          {d.student?.rollNumber} · {d.student?.department?.code}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          Semester {d.semester}
                        </div>
                        <div className="text-[var(--text-secondary)] text-[11px]">{d.academicYear}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--text-primary)]">
                        {fmt(d.totalDemanded)}
                      </td>
                      <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(d.totalPaid)}
                      </td>
                      <td className="p-4 text-right font-bold text-[var(--text-primary)]">
                        {d.outstandingAmount > 0 ? (
                          <span className={isOverdue ? 'text-danger-600 dark:text-danger-400' : ''}>
                            {fmt(d.outstandingAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {d.lateFeeAccrued > 0 ? (
                          <span className="text-danger-500 font-bold">+{fmt(d.lateFeeAccrued)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-[var(--text-secondary)]">
                          {new Date(d.dueDate).toLocaleDateString()}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-danger-500 font-semibold flex items-center gap-1">
                            <Clock size={11} /> Overdue
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={
                            d.status === 'paid'
                              ? 'success'
                              : isOverdue
                              ? 'danger'
                              : d.status === 'partial'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {d.status?.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Raise Demand Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2 font-bold text-base">
                  <FileSpreadsheet size={18} className="text-brand-500" /> Raise Individual Fee Demand
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRaiseDemand} className="space-y-3.5 text-xs">
                {/* Select Student */}
                <div>
                  <label className="font-semibold block mb-1">Select Student</label>
                  <select
                    required
                    value={modalForm.studentId}
                    onChange={(e) => setModalForm({ ...modalForm, studentId: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">-- Choose Student --</option>
                    {allStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.rollNumber} — {s.name} ({s.department?.code}, Sem {s.currentSemester})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Fee Structure */}
                <div>
                  <label className="font-semibold block mb-1">Fee Structure & Schedule</label>
                  <select
                    required
                    value={modalForm.feeStructureId}
                    onChange={(e) => setModalForm({ ...modalForm, feeStructureId: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">-- Choose Fee Structure --</option>
                    {feeStructures.map((fs) => (
                      <option key={fs._id} value={fs._id}>
                        Sem {fs.semester} ({fs.academicYear}) — {fs.department?.code} — Total: {fmt(fs.totalAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="font-semibold block mb-1">Custom Due Date (Optional)</label>
                  <input
                    type="date"
                    value={modalForm.dueDate}
                    onChange={(e) => setModalForm({ ...modalForm, dueDate: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>

                {/* Reason / Notes */}
                <div>
                  <label className="font-semibold block mb-1">Administrative Note</label>
                  <input
                    type="text"
                    value={modalForm.reason}
                    onChange={(e) => setModalForm({ ...modalForm, reason: e.target.value })}
                    placeholder="e.g. Regular semester demand assessment"
                    className="input w-full text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={submitting}>
                    Assess & Post to Ledger
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
