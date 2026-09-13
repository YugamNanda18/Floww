import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import PageHeader from '../../components/shared/PageHeader.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  Users,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Receipt,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  UserPlus,
  Upload,
  Edit3,
  Settings,
  Bell,
  Send,
  Mail,
  Info,
} from 'lucide-react';

const fmt = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

export default function Students() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSuper = location.pathname.startsWith('/superuser');

  const [data, setData] = useState({ students: [], stats: {} });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'defaulter' | 'partial' | 'paid'
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [drawerTab, setDrawerTab] = useState('financials'); // 'financials' | 'academics'

  // Waiver / Scholarship action modal state
  const [actionModal, setActionModal] = useState(null); // { type: 'waive' | 'scholarship', studentId, demandId }
  const [actionReason, setActionReason] = useState('');
  const [scholarshipAmount, setScholarshipAmount] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Due Reminder State
  const [sendingMassReminders, setSendingMassReminders] = useState(false);
  const [sendingSingleReminder, setSendingSingleReminder] = useState(null);

  const handleSendMassReminders = async () => {
    if (!window.confirm('Send real-time fee due reminders (with login credentials, portal link & due amounts) to ALL students with outstanding fees?')) return;
    setSendingMassReminders(true);
    try {
      const res = await api.post('/admin/reminders/send-all');
      toast.success(res.data.message || 'Real-time fee due reminders sent to all due students!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send mass due reminders');
    } finally {
      setSendingMassReminders(false);
    }
  };

  const handleSendIndividualReminder = async (student) => {
    setSendingSingleReminder(student._id);
    try {
      const res = await api.post(`/admin/reminders/send-student/${student._id}`);
      toast.success(res.data.message || `Real-time fee reminder email sent to ${student.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder email');
    } finally {
      setSendingSingleReminder(null);
    }
  };

  // Manual Student Creation Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    password: 'demo123',
    departmentId: '',
    batch: '2025-2029',
    currentSemester: '1',
    gender: 'male',
    dob: '2006-01-01',
    bloodGroup: 'O+',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    emergencyContact: '',
    profilePhoto: '',
    bio: '',
  });

  // Edit Student Profile & Settings State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    departmentId: '',
    batch: '2025-2029',
    currentSemester: 1,
    gender: 'male',
    dob: '',
    bloodGroup: 'O+',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    emergencyContact: '',
    profilePhoto: '',
    bio: '',
    isActive: true,
    password: '',
  });

  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      departmentId: student.department?._id || student.department || '',
      batch: student.batch || '2025-2029',
      currentSemester: student.currentSemester || 1,
      gender: student.gender || 'male',
      dob: student.dob || '',
      bloodGroup: student.bloodGroup || 'O+',
      phone: student.phone || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      profilePhoto: student.profilePhoto || '',
      bio: student.bio || '',
      isActive: student.isActive !== undefined ? student.isActive : true,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSubmittingEdit(true);
    try {
      const res = await api.put(`/admin/students/${editingStudent._id}`, editForm);
      toast.success(res.data.message || `Student profile updated successfully!`);
      setShowEditModal(false);
      setEditingStudent(null);
      if (selectedStudent && selectedStudent._id === editingStudent._id) {
        handleOpenStudent(res.data.data);
      }
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student profile');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.rollNumber || !addForm.departmentId) {
      toast.error('Name, Email, Roll Number, and Department are required.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await api.post('/admin/students', addForm);
      toast.success(res.data.message || `Student ${addForm.name} registered successfully!`);
      setShowAddModal(false);
      setAddForm({
        name: '',
        email: '',
        rollNumber: '',
        password: 'demo123',
        departmentId: '',
        batch: '2025-2029',
        currentSemester: '1',
        gender: 'male',
        dob: '2006-01-01',
        bloodGroup: 'O+',
        phone: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
        emergencyContact: '',
        profilePhoto: '',
        bio: '',
      });
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register student');
    } finally {
      setSubmittingAdd(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedDept, selectedStatus, search]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      setDepartments(res.data.data || []);
    } catch {}
  };

  const fetchStudents = async () => {
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (search) params.search = search;

      const res = await api.get('/admin/students', { params });
      setData(res.data.data || { students: [], stats: {} });
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/admin/students/${student._id}/history`);
      setStudentHistory(res.data.data);
    } catch (err) {
      toast.error('Failed to load student history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleWaiveLateFee = async (demandId) => {
    if (!actionReason) {
      toast.error('Please provide a justification for late fee waiver.');
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post('/admin/waivers/late-fee', {
        demandId,
        reason: actionReason,
      });
      toast.success('Late fee waived successfully and ledger adjusted!');
      setActionModal(null);
      setActionReason('');
      if (selectedStudent) handleOpenStudent(selectedStudent);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to waive late fee.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApplyScholarship = async (demandId) => {
    if (!scholarshipAmount || !actionReason) {
      toast.error('Please enter scholarship amount and reason.');
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post('/admin/scholarships/apply', {
        demandId,
        amount: Math.round(parseFloat(scholarshipAmount) * 100),
        reason: actionReason,
      });
      toast.success('Scholarship granted and posted to ledger!');
      setActionModal(null);
      setActionReason('');
      setScholarshipAmount('');
      if (selectedStudent) handleOpenStudent(selectedStudent);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply scholarship.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !data.students.length) return <PageSpinner />;

  const { students, stats } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Students & Defaulters Management"
        subtitle="Track student fee statuses, identify chronic defaulters, and execute institutional adjustments."
        breadcrumbs={['Finance Admin', 'Students']}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              id="mass-reminder-btn"
              variant="warning"
              size="sm"
              loading={sendingMassReminders}
              onClick={handleSendMassReminders}
              className="flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Bell size={14} /> Send Real-Time Due Reminders (All)
            </Button>
            {isSuper && (
              <>
                <Button
                  id="bulk-csv-btn"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/superuser/bulk'}
                  className="flex items-center gap-1.5"
                >
                  <Upload size={14} /> Bulk CSV Upload
                </Button>
                <Button
                  id="add-student-btn"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/superuser/add-student')}
                  className="flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> Add Student Manually
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Academic Superuser Provisioning Banner (Admin view) */}
      {!isSuper && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 text-xs text-blue-700 dark:text-blue-400">
          <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-bold text-sm text-[var(--text-primary)]">Academic Student Governance & Real-Time Sync</p>
            <p className="mt-0.5 text-[var(--text-secondary)] leading-relaxed">
              Admissions and student registrations are managed exclusively by Academic Superusers according to their branch. Once registered, student profiles and fee demands synchronize into this console in real time, empowering Finance Administrators to manage fee ledgers, offline payments, waivers, caution deposits, and real-time payment notices.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Total Enrolled</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalStudents || 0}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Active Defaulters</p>
            <h3 className="text-2xl font-bold text-danger-600 dark:text-danger-400">
              {stats.totalDefaulters || 0}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Institute Receivables</p>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {fmt(stats.totalInstituteOutstanding)}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Cohort Compliance</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalStudents
                ? Math.round(((stats.totalStudents - stats.totalDefaulters) / stats.totalStudents) * 100)
                : 0}%
            </h3>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'All Students' },
              { id: 'defaulter', label: '⚠️ Defaulters Only' },
              { id: 'partial', label: 'Partially Paid' },
              { id: 'paid', label: 'Cleared' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  selectedStatus === tab.id
                    ? 'bg-[var(--bg-card)] text-brand-600 dark:text-brand-400 shadow-sm border border-[var(--border-color)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Department Select */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input text-xs py-2 pr-8"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-8 py-2 text-xs w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Student List Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                <th className="p-4">Roll No & Student</th>
                <th className="p-4">Dept / Sem</th>
                <th className="p-4 text-right">Demanded</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Outstanding</th>
                <th className="p-4 text-right">Late Fee</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const fin = s.financials || {};
                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-[var(--bg-base)]/60 transition-colors cursor-pointer"
                      onClick={() => handleOpenStudent(s)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {s.profilePhoto ? (
                            <img
                              src={s.profilePhoto}
                              alt={s.name}
                              className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--border-color)] shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {s.name?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[var(--text-primary)] text-sm truncate">{s.name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                s.gender === 'female'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                              }`}>
                                {s.gender === 'female' ? '♀ Female' : '♂ Male'}
                              </span>
                            </div>
                            <div className="text-[var(--text-muted)] text-[11px] font-mono mt-0.5">
                              {s.rollNumber} · {s.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {s.department?.code || 'N/A'}
                        </div>
                        <div className="text-[var(--text-secondary)] text-[11px]">
                          Sem {s.currentSemester} · Batch {s.batch}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--text-primary)]">
                        {fmt(fin.totalDemanded)}
                      </td>
                      <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(fin.totalPaid)}
                      </td>
                      <td className="p-4 text-right font-bold text-[var(--text-primary)]">
                        {fin.totalOutstanding > 0 ? (
                          <span className={fin.isDefaulter ? 'text-danger-600 dark:text-danger-400' : ''}>
                            {fmt(fin.totalOutstanding)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {fin.totalLateFee > 0 ? (
                          <span className="text-danger-500 font-bold">+{fmt(fin.totalLateFee)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={
                            fin.feeStatus === 'paid'
                              ? 'success'
                              : fin.isDefaulter
                              ? 'danger'
                              : fin.feeStatus === 'partial'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {fin.isDefaulter ? 'DEFAULTER' : fin.feeStatus?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenStudent(s)}
                            className="flex items-center gap-1"
                          >
                            <Eye size={12} /> Inspect
                          </Button>
                          {fin.totalOutstanding > 0 && (
                            <Button
                              variant="ghost"
                              size="xs"
                              loading={sendingSingleReminder === s._id}
                              onClick={() => handleSendIndividualReminder(s)}
                              title="Send Real-Time Fee Due Reminder Email"
                              className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 font-semibold"
                            >
                              <Bell size={12} /> Reminder
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenEditStudent(s)}
                            className="flex items-center gap-1"
                          >
                            <Edit3 size={12} /> Edit Profile
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Profile Drawer / Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-[var(--bg-card)] border-l border-[var(--border-color)] h-full overflow-y-auto p-6 text-[var(--text-primary)] shadow-2xl space-y-6"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-3.5">
                  {selectedStudent.profilePhoto ? (
                    <img
                      src={selectedStudent.profilePhoto}
                      alt={selectedStudent.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-500/40 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-base font-bold shadow-md">
                      {selectedStudent.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedStudent.gender === 'female'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                      }`}>
                        {selectedStudent.gender === 'female' ? '♀ Female' : '♂ Male'}
                      </span>
                      {selectedStudent.financials?.isDefaulter && (
                        <Badge variant="danger">DEFAULTER</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {selectedStudent.rollNumber} · {selectedStudent.department?.name || selectedStudent.department?.code} · Sem {selectedStudent.currentSemester}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedStudent.financials?.totalOutstanding > 0 && (
                    <Button
                      variant="warning"
                      size="xs"
                      loading={sendingSingleReminder === selectedStudent._id}
                      onClick={() => handleSendIndividualReminder(selectedStudent)}
                      className="flex items-center gap-1 font-bold"
                    >
                      <Bell size={13} /> Send Due Reminder
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleOpenEditStudent(selectedStudent)}
                    className="flex items-center gap-1"
                  >
                    <Edit3 size={13} /> Edit Profile & Settings
                  </Button>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-20 flex justify-center">
                  <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : studentHistory ? (
                <div className="space-y-6">
                  {/* Drawer Tab Switcher */}
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                    <button
                      onClick={() => setDrawerTab('financials')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        drawerTab === 'financials'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      💳 Financial Ledger
                    </button>
                    <button
                      onClick={() => setDrawerTab('academics')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        drawerTab === 'academics'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      🎓 Academics & 75%
                    </button>
                    <button
                      onClick={() => setDrawerTab('profile')}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        drawerTab === 'profile'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      👤 Student Profile & ID
                    </button>
                  </div>

                  {drawerTab === 'financials' && (
                    <div className="space-y-6">
                      {/* Financial Balance Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                          <p className="text-[11px] text-[var(--text-muted)]">Demanded Total</p>
                          <p className="text-base font-bold">{fmt(selectedStudent.financials?.totalDemanded)}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                          <p className="text-[11px] text-[var(--text-muted)]">Total Cleared</p>
                          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {fmt(selectedStudent.financials?.totalPaid)}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                          <p className="text-[11px] text-[var(--text-muted)]">Net Outstanding</p>
                          <p className="text-base font-bold text-danger-600 dark:text-danger-400">
                            {fmt(selectedStudent.financials?.totalOutstanding)}
                          </p>
                        </div>
                      </div>

                      {/* Semester Fee Demands */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                          <FileText size={14} className="text-brand-500" /> Semester Demands History
                        </h4>
                        <div className="space-y-3">
                          {studentHistory.demands?.map((d) => (
                            <div
                              key={d._id}
                              className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)]/50 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-sm">
                                    Semester {d.semester} ({d.academicYear})
                                  </span>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    Due: {new Date(d.dueDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    d.status === 'paid'
                                      ? 'success'
                                      : d.status === 'overdue'
                                      ? 'danger'
                                      : d.status === 'partial'
                                      ? 'warning'
                                      : 'info'
                                  }
                                >
                                  {d.status?.toUpperCase()}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-[var(--text-muted)]">Demanded</span>
                                  <p className="font-semibold font-mono">{fmt(d.totalDemanded)}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)]">Paid</span>
                                  <p className="font-semibold font-mono text-emerald-600">{fmt(d.totalPaid)}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)]">Outstanding</span>
                                  <p className="font-semibold font-mono text-danger-600">
                                    {fmt(d.outstandingAmount)}
                                  </p>
                                </div>
                              </div>

                              {d.lateFeeAccrued > 0 && (
                                <div className="flex items-center justify-between text-xs text-danger-600 dark:text-danger-400 font-medium pt-2 border-t border-[var(--border-color)]">
                                  <span>Late Fee Accrued: {fmt(d.lateFeeAccrued)}</span>
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    onClick={() =>
                                      setActionModal({ type: 'waive', demandId: d._id, student: selectedStudent })
                                    }
                                  >
                                    Waive Penalty
                                  </Button>
                                </div>
                              )}

                              {d.outstandingAmount > 0 && (
                                <div className="flex justify-end pt-1">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() =>
                                      setActionModal({ type: 'scholarship', demandId: d._id, student: selectedStudent })
                                    }
                                    className="text-violet-600 dark:text-violet-400 text-[11px]"
                                  >
                                    Apply Scholarship Concession
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Caution Money Status */}
                      {studentHistory.cautionMoney && (
                        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)]">
                          <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Caution Money Deposit
                          </h4>
                          <div className="flex justify-between items-center text-xs">
                            <span>Deposited Amount: <strong>{fmt(studentHistory.cautionMoney.depositAmount)}</strong></span>
                            <Badge variant={studentHistory.cautionMoney.status === 'refunded' ? 'success' : 'info'}>
                              {studentHistory.cautionMoney.status?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Recent Transactions */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                          <Receipt size={14} className="text-emerald-500" /> Captured Transactions
                        </h4>
                        <div className="space-y-2">
                          {studentHistory.transactions?.slice(0, 5).map((t) => (
                            <div
                              key={t._id}
                              className="p-3 rounded-xl border border-[var(--border-color)] flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-[var(--text-primary)]">
                                  {t.method?.toUpperCase()} · {fmt(t.amount)}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                                  {t.razorpayPaymentId || t.offlineDetails?.ddNumber || t.idempotencyKey}
                                </p>
                              </div>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {drawerTab === 'academics' && (
                    /* ─── Academics & Attendance Tab ─────────────────────── */
                    <div className="space-y-5">
                      {/* Attendance Overview Card */}
                      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)]/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Mandatory 75% Attendance Status
                          </span>
                          <Badge variant={studentHistory.attendance?.hasShortage ? 'danger' : 'success'} dot>
                            {studentHistory.attendance?.hasShortage ? 'Shortage Alert (<75%)' : 'Compliant (≥75%)'}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                            {studentHistory.attendance?.overallPercentage || 0}%
                          </p>
                          <span className="text-xs text-[var(--text-muted)]">
                            {studentHistory.attendance?.subjects?.filter(s => s.isShortage).length || 0} Subject(s) Below 75%
                          </span>
                        </div>
                      </div>

                      {/* Course-Wise Attendance List */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                          Course-Wise Attendance Roster
                        </h4>
                        <div className="space-y-2.5">
                          {studentHistory.attendance?.subjects?.map((sub) => (
                            <div
                              key={sub.subjectCode}
                              className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-sm text-[var(--text-primary)]">{sub.subjectName}</p>
                                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                                  {sub.subjectCode} · {sub.facultyName}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`font-mono font-bold text-sm ${
                                  sub.percentage >= 75 ? 'text-emerald-500' : 'text-danger-500'
                                }`}>
                                  {sub.percentage}%
                                </span>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  {sub.attendedClasses} / {sub.totalClasses} classes
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Institutional Timetable Note */}
                      <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 text-xs space-y-1">
                        <p className="font-bold text-[var(--text-primary)]">
                          Institutional Schedule: Mon–Sat (08:00 AM – 03:00 PM)
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          Lunch Break: 11:15 AM – 12:00 PM (45 Minutes). Six academic periods daily.
                        </p>
                      </div>
                    </div>
                  )}

                  {drawerTab === 'profile' && (
                    /* Profile & Identity Tab */
                    <div className="space-y-4">
                      {/* Identity Card Mini View */}
                      <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-white/20 shadow flex items-center justify-center p-0.5 shrink-0">
                              <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                              Floww Institutional Identity
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Verified Active
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          {selectedStudent.profilePhoto ? (
                            <img
                              src={selectedStudent.profilePhoto}
                              alt={selectedStudent.name}
                              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-xl font-bold">
                              {selectedStudent.name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-base font-bold text-white">{selectedStudent.name}</h4>
                            <p className="font-mono text-xs text-sky-300 font-semibold">{selectedStudent.rollNumber}</p>
                            <p className="text-xs text-white/70 mt-1">
                              {selectedStudent.department?.name || selectedStudent.department?.code} · Sem {selectedStudent.currentSemester}
                            </p>
                            <div className="flex gap-2 mt-1.5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10">
                                {selectedStudent.gender === 'female' ? '♀ Female' : '♂ Male'}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10">
                                Blood Group: {selectedStudent.bloodGroup || 'O+'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact & Personal Information */}
                      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] space-y-3 text-xs">
                        <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                          Communication & Contact Details
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[var(--text-muted)]">Official Email</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedStudent.email}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Student Phone</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5 font-mono">{selectedStudent.phone || '—'}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Date of Birth</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5 font-mono">{selectedStudent.dob || '—'}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Batch Cohort</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedStudent.batch || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Guardian & Emergency Details */}
                      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] space-y-3 text-xs">
                        <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                          Guardian & Residential Records
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[var(--text-muted)]">Guardian Name</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedStudent.guardianName || '—'}</p>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Guardian Phone</span>
                            <p className="font-medium text-[var(--text-primary)] mt-0.5 font-mono">{selectedStudent.guardianPhone || '—'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)]">Permanent Address</span>
                          <p className="font-medium text-[var(--text-primary)] mt-0.5">{selectedStudent.address || '—'}</p>
                        </div>
                        {selectedStudent.bio && (
                          <div className="pt-2 border-t border-[var(--border-color)]">
                            <span className="text-[var(--text-muted)]">Academic Bio</span>
                            <p className="text-[var(--text-secondary)] italic mt-0.5">"{selectedStudent.bio}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Modal: Waive Late Fee or Apply Scholarship */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-4"
            >
              <h3 className="text-base font-bold">
                {actionModal.type === 'waive' ? 'Waive Late Fee Penalty' : 'Grant Institutional Scholarship'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {actionModal.type === 'waive'
                  ? 'Clears accrued late fee in full and posts corresponding reversing entry to the institutional ledger.'
                  : 'Applies direct fee concession to the student receivable balance with formal audit trail.'}
              </p>

              {actionModal.type === 'scholarship' && (
                <div>
                  <label className="text-xs font-semibold">Scholarship Amount (₹)</label>
                  <input
                    type="number"
                    value={scholarshipAmount}
                    onChange={(e) => setScholarshipAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="input text-xs mt-1 w-full"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold">Justification / Reason (Mandatory Audit)</label>
                <textarea
                  rows="3"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Vice Chancellor discretionary merit concession / Medical waiver..."
                  className="input text-xs mt-1 w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActionModal(null)}
                  disabled={submittingAction}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={submittingAction}
                  onClick={() =>
                    actionModal.type === 'waive'
                      ? handleWaiveLateFee(actionModal.demandId)
                      : handleApplyScholarship(actionModal.demandId)
                  }
                >
                  Confirm & Post to Ledger
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Student Onboarding Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] my-8 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">Manually Onboard New Student</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Create student profile, assign department fee structure, and initialize ledger records.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                {/* 1. Academic & Credentials Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider">1. Academic & Credentials</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        placeholder="e.g. Vikramaditya Singh"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Student Roll Number *</label>
                      <input
                        type="text"
                        required
                        value={addForm.rollNumber}
                        onChange={(e) => setAddForm({ ...addForm, rollNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. CSE2503, ECE2404"
                        className="input text-xs mt-1 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        placeholder="e.g. vikram@demo.com"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Initial Password</label>
                      <input
                        type="text"
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                        placeholder="Default: demo123"
                        className="input text-xs mt-1 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Department *</label>
                      <select
                        required
                        value={addForm.departmentId}
                        onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Academic Batch</label>
                      <input
                        type="text"
                        value={addForm.batch}
                        onChange={(e) => setAddForm({ ...addForm, batch: e.target.value })}
                        placeholder="e.g. 2025-2029"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Enrolled Semester</label>
                      <select
                        value={addForm.currentSemester}
                        onChange={(e) => setAddForm({ ...addForm, currentSemester: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Gender</label>
                      <select
                        value={addForm.gender}
                        onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Personal & Guardian Details */}
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider">2. Personal & Guardian Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Date of Birth</label>
                      <input
                        type="date"
                        value={addForm.dob}
                        onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Blood Group</label>
                      <select
                        value={addForm.bloodGroup}
                        onChange={(e) => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Student Phone Number</label>
                      <input
                        type="text"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Full Name</label>
                      <input
                        type="text"
                        value={addForm.guardianName}
                        onChange={(e) => setAddForm({ ...addForm, guardianName: e.target.value })}
                        placeholder="e.g. Surendra Singh"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Contact Phone</label>
                      <input
                        type="text"
                        value={addForm.guardianPhone}
                        onChange={(e) => setAddForm({ ...addForm, guardianPhone: e.target.value })}
                        placeholder="+91 98765 00000"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Emergency Contact</label>
                      <input
                        type="text"
                        value={addForm.emergencyContact}
                        onChange={(e) => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                        placeholder="+91 98765 11111"
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Permanent / Residential Address</label>
                    <textarea
                      rows="2"
                      value={addForm.address}
                      onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      placeholder="Street address, city, state, pincode..."
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                </div>

                {/* 3. Avatar & Bio */}
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider">3. Profile Photo & Bio</h4>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Profile Photo URL</label>
                    <input
                      type="url"
                      value={addForm.profilePhoto}
                      onChange={(e) => setAddForm({ ...addForm, profilePhoto: e.target.value })}
                      placeholder="https://images.unsplash.com/... or choose preset below"
                      className="input text-xs mt-1 w-full"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-[var(--text-muted)]">Quick Presets:</span>
                      {[
                        { label: '👨🏻‍🎓 Male 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
                        { label: '🧑🏽‍💻 Male 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
                        { label: '👩🏻‍🎓 Female 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
                        { label: '👩🏽‍💻 Female 2', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, profilePhoto: preset.url })}
                          className="px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] hover:border-brand-500 hover:text-brand-500 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Student Bio / Interests</label>
                    <textarea
                      rows="2"
                      value={addForm.bio}
                      onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })}
                      placeholder="Academic focus, specializations, project interests..."
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                </div>

                {/* System Automation Notice */}
                <div className="p-3 rounded-xl border border-brand-500/20 bg-brand-500/5 text-xs text-[var(--text-secondary)] space-y-1">
                  <p className="font-semibold text-[var(--text-primary)]">⚡ Automatic Onboarding Pipeline:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[var(--text-muted)]">
                    <li>Determines semester fee structure & creates active semester Fee Demand.</li>
                    <li>Posts initial double-entry journal entry (<strong className="text-[var(--text-primary)]">DR Student Fee Receivable</strong> / <strong className="text-[var(--text-primary)]">CR Tuition Revenue</strong>).</li>
                    <li>Establishes ₹10,000 Caution Deposit record in institutional treasury escrow.</li>
                    <li>Maps department timetable schedule and seeds baseline attendance tracking.</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    disabled={submittingAdd}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submittingAdd}
                    className="flex items-center gap-1.5"
                  >
                    <UserPlus size={14} /> Register & Onboard Student
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Master Edit Student Profile & Settings Modal */}
      <AnimatePresence>
        {showEditModal && editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] my-8 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Edit Student Profile & Settings
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      {editingStudent.name} · {editingStudent.rollNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingStudent(null);
                  }}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditStudentSubmit} className="space-y-4">
                {/* 1. Academic Placement & Identity */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">1. Identity & Academic Placement</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Student Roll Number</label>
                      <input
                        type="text"
                        required
                        value={editForm.rollNumber}
                        onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value.toUpperCase() })}
                        className="input text-xs mt-1 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Email Address</label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Reset Password (Optional)</label>
                      <input
                        type="text"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        placeholder="Leave blank to keep current"
                        className="input text-xs mt-1 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Department</label>
                      <select
                        required
                        value={editForm.departmentId}
                        onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Academic Batch</label>
                      <input
                        type="text"
                        value={editForm.batch}
                        onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Enrolled Semester</label>
                      <select
                        value={editForm.currentSemester}
                        onChange={(e) => setEditForm({ ...editForm, currentSemester: parseInt(e.target.value) })}
                        className="input text-xs mt-1 w-full"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Gender</label>
                      <select
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Guardian Information */}
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">2. Contact & Family Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Date of Birth</label>
                      <input
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Blood Group</label>
                      <select
                        value={editForm.bloodGroup}
                        onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      >
                        {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Name</label>
                      <input
                        type="text"
                        value={editForm.guardianName}
                        onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Phone</label>
                      <input
                        type="text"
                        value={editForm.guardianPhone}
                        onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Emergency Contact</label>
                      <input
                        type="text"
                        value={editForm.emergencyContact}
                        onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                        className="input text-xs mt-1 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Address</label>
                    <textarea
                      rows="2"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                </div>

                {/* 3. Avatar, Bio & Status */}
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">3. Avatar & Account Status</h4>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Profile Photo URL</label>
                    <input
                      type="url"
                      value={editForm.profilePhoto}
                      onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-[var(--text-muted)]">Quick Presets:</span>
                      {[
                        { label: '👨🏻‍🎓 Male 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
                        { label: '🧑🏽‍💻 Male 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
                        { label: '👩🏻‍🎓 Female 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
                        { label: '👩🏽‍💻 Female 2', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, profilePhoto: preset.url })}
                          className="px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Student Bio</label>
                    <textarea
                      rows="2"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">Account Active Status:</label>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        editForm.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                          : 'bg-danger-500/10 text-danger-600 border border-danger-500/30'
                      }`}
                    >
                      {editForm.isActive ? '✅ Active Student' : '⛔ Suspended / Deactivated'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingStudent(null);
                    }}
                    disabled={submittingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submittingEdit}
                    className="flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Update Student Settings
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

