import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  ArrowUpRight,
  Edit2,
  Save,
  X,
  Award,
  Users,
  Layers,
} from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export default function SuperuserAttendance() {
  const { user } = useAuth();
  const isCentralized = !user?.department;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, shortage, safe

  // Centralized Superuser: can switch departments
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Attendance Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustStudent, setAdjustStudent] = useState(null);
  const [adjustSubject, setAdjustSubject] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    attendedClasses: 0,
    totalClasses: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isCentralized) {
      fetchDepartments();
    }
  }, [isCentralized]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedSemester, selectedDeptId]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      const depts = res.data.data?.departments || res.data.data || [];
      setDepartments(depts);
      if (depts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(depts[0]._id);
      }
    } catch (err) {
      console.error('Failed to load departments:', err.message);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = { semester: selectedSemester };
      if (selectedDeptId) params.departmentId = selectedDeptId;

      const res = await api.get('/superuser/attendance', { params });
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load attendance roster');
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (student, subject) => {
    setAdjustStudent(student);
    setAdjustSubject(subject);
    setAdjustForm({
      attendedClasses: subject.attendedClasses || 0,
      totalClasses: subject.totalClasses || 0,
    });
    setShowAdjustModal(true);
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!adjustStudent || !adjustSubject) return;

    setSaving(true);
    try {
      await api.post('/superuser/attendance/update', {
        studentId: adjustStudent._id,
        subjectCode: adjustSubject.subjectCode,
        attendedClasses: adjustForm.attendedClasses,
        totalClasses: adjustForm.totalClasses,
      });

      toast.success(`Attendance for ${adjustSubject.subjectCode} updated!`);
      setShowAdjustModal(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const roster = data?.roster || [];
  const metrics = data?.metrics || {};
  const currentDept = data?.department;

  const filteredRoster = roster.filter((item) => {
    const q = search.toLowerCase();
    const s = item.student;
    const matchesSearch =
      s.name?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const isShort = item.attendance.hasShortage || item.attendance.overallPercentage < 75;
    if (filterType === 'shortage') return isShort;
    if (filterType === 'safe') return !isShort;

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title={
          currentDept
            ? `${currentDept.name} (${currentDept.code}) — Attendance & 75% Engine`
            : 'Department Attendance & 75% Compliance Engine'
        }
        subtitle="Department-level student attendance monitoring with statutory 75% minimum compliance gate and lecture recovery tracking."
      />

      {/* Centralized Superuser Department Switcher */}
      {isCentralized && departments.length > 0 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-brand-500" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Centralized Superuser Oversight (Dean Mode)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Select department to inspect and manage student attendance compliance
              </p>
            </div>
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="input text-xs font-semibold py-1.5 px-3 min-w-[220px]"
          >
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                🏢 {d.name} ({d.code})
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Students Enrolled</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.totalStudents || 0}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-brand-500/20">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Average Attendance</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.avgPercentage || 0}%
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Compliant (≥75%)</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.safeCount || 0}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-danger-500/20">
          <div className="w-10 h-10 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Debarred / Shortage (&lt;75%)</p>
            <h3 className="text-2xl font-bold text-danger-600 dark:text-danger-400">
              {metrics.shortageCount || 0}
            </h3>
          </div>
        </Card>
      </div>

      {/* Semester Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
          <button
            key={sem}
            onClick={() => setSelectedSemester(sem)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSemester === sem
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Semester {sem} Roster
          </button>
        ))}
      </div>

      {/* Roster & Subject Breakdown Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-muted)]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input text-xs py-1.5"
            >
              <option value="all">All Students</option>
              <option value="shortage">Shortage Students (&lt;75%)</option>
              <option value="safe">Compliant Students (≥75%)</option>
            </select>
          </div>
        </div>

        {/* Student Roster Cards */}
        {loading ? (
          <PageSpinner />
        ) : filteredRoster.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No students found matching current filters in Semester {selectedSemester}.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRoster.map((item) => {
              const s = item.student;
              const att = item.attendance;
              const isShort = att.hasShortage || att.overallPercentage < 75;

              return (
                <div
                  key={s._id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isShort
                      ? 'border-danger-500/30 bg-danger-500/5'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                  }`}
                >
                  {/* Student Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-xs font-mono">
                        {s.rollNumber.substring(s.rollNumber.length - 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[var(--text-primary)]">{s.name}</h4>
                          <span className="font-mono text-xs font-bold text-brand-500">
                            {s.rollNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">{s.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          Overall Attendance
                        </span>
                        <span
                          className={`text-lg font-mono font-extrabold ${
                            !isShort
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-danger-600 dark:text-danger-400'
                          }`}
                        >
                          {att.overallPercentage}%
                        </span>
                      </div>

                      <Badge variant={!isShort ? 'success' : 'danger'}>
                        {!isShort ? '75% Eligible' : 'Debarment Warning'}
                      </Badge>
                    </div>
                  </div>

                  {/* Subject Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                    {(att.subjects || []).map((sub) => {
                      const subShort = sub.percentage < 75;

                      return (
                        <div
                          key={sub.subjectCode}
                          className="p-3 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                                {sub.subjectCode}
                              </span>
                              <span
                                className={`text-xs font-mono font-bold ${
                                  !subShort
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-danger-600 dark:text-danger-400'
                                }`}
                              >
                                {sub.percentage}%
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {sub.subjectName}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {sub.attendedClasses} / {sub.totalClasses} Classes
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-color)]/60 text-[10px]">
                            {subShort ? (
                              <span className="text-danger-500 font-semibold flex items-center gap-0.5">
                                <ArrowUpRight size={11} /> Need +{sub.classesToAttendFor75}
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 size={11} /> Safe bunk: {sub.classesCanBunkFor75}
                              </span>
                            )}

                            <button
                              onClick={() => openAdjustModal(s, sub)}
                              className="text-brand-500 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Edit2 size={10} /> Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── ADJUST ATTENDANCE MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAdjustModal && adjustStudent && adjustSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Edit2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Adjust Attendance: {adjustStudent.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {adjustSubject.subjectCode} — {adjustSubject.subjectName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAttendance} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Classes Attended *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={adjustForm.totalClasses}
                      value={adjustForm.attendedClasses}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, attendedClasses: parseInt(e.target.value) || 0 })
                      }
                      className="input text-xs mt-1 w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Total Conducted *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={adjustForm.totalClasses}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, totalClasses: parseInt(e.target.value) || 1 })
                      }
                      className="input text-xs mt-1 w-full font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Resulting Percentage:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      adjustForm.totalClasses > 0 &&
                      (adjustForm.attendedClasses / adjustForm.totalClasses) * 100 >= 75
                        ? 'text-emerald-500'
                        : 'text-danger-500'
                    }`}
                  >
                    {adjustForm.totalClasses > 0
                      ? ((adjustForm.attendedClasses / adjustForm.totalClasses) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAdjustModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    className="flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Update Attendance
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
