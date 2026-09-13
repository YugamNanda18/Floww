import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users,
  GraduationCap,
  Building2,
  Search,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  ArrowUpRight,
  Filter,
  Layers,
  Sparkles,
  Award,
  CreditCard,
  Lock,
} from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export default function SemesterStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, defaulters, shortage, safe

  // Centralized Superuser: can switch departments
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const isCentralized = !user?.department;

  useEffect(() => {
    if (isCentralized) {
      fetchDepartments();
    }
  }, [isCentralized]);

  useEffect(() => {
    fetchSemesterStudents();
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

  const fetchSemesterStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSemester !== 'ALL') params.semester = selectedSemester;
      if (selectedDeptId) params.departmentId = selectedDeptId;

      const res = await api.get('/superuser/semester-students', { params });
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load semester students roster');
    } finally {
      setLoading(false);
    }
  };

  const students = data?.students || [];
  const counts = data?.semesterCounts || {};
  const currentDept = data?.department;

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === 'defaulters') return s.hasDues;
    if (filterType === 'shortage') return s.hasShortage || s.attendancePercentage < 75;
    if (filterType === 'safe') return !s.hasShortage && s.attendancePercentage >= 75;

    return true;
  });

  const totalDuesInScope = students.reduce((acc, s) => acc + (s.totalDue || 0), 0);
  const shortageInScope = students.filter((s) => s.hasShortage || s.attendancePercentage < 75).length;
  const safeInScope = students.length - shortageInScope;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title={
          currentDept
            ? `${currentDept.name} (${currentDept.code}) — Semester Students`
            : 'Department Semester-Wise Students'
        }
        subtitle={`Branch-level roster filtered semester-wise (Sem 1 to 8) with live attendance compliance and fee status.`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/superuser/add-student')}
              className="flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              Add Student
            </Button>
          </div>
        }
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
                Switch department to view students scoped to that academic branch
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Students in View</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{students.length}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Safe Attendance (≥75%)</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {safeInScope}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-danger-500/20">
          <div className="w-10 h-10 rounded-xl bg-danger-500/10 text-danger-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Shortage / Debarred (&lt;75%)</p>
            <h3 className="text-2xl font-bold text-danger-600 dark:text-danger-400">
              {shortageInScope}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-amber-500/20">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Outstanding Dues</p>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              ₹{totalDuesInScope.toLocaleString('en-IN')}
            </h3>
          </div>
        </Card>
      </div>

      {/* Semester Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSemester('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            selectedSemester === 'ALL'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
              : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span>All Semesters</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
          <button
            key={sem}
            onClick={() => setSelectedSemester(String(sem))}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedSemester === String(sem)
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Semester {sem}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                selectedSemester === String(sem)
                  ? 'bg-black/20 text-white'
                  : 'bg-[var(--bg-base)] text-[var(--text-muted)]'
              }`}
            >
              {counts[sem] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Roster Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
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
              <option value="defaulters">With Fee Dues Only</option>
              <option value="shortage">Attendance Shortage (&lt;75%)</option>
              <option value="safe">Attendance Safe (≥75%)</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-b border-[var(--border-color)] font-semibold">
              <tr>
                <th className="p-3">Roll Number</th>
                <th className="p-3">Student Name & Contact</th>
                <th className="p-3">Semester</th>
                <th className="p-3">Attendance</th>
                <th className="p-3">Fee Status</th>
                <th className="p-3">Compliance Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[var(--text-muted)]">
                    Loading branch semester roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[var(--text-muted)]">
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isShort = s.hasShortage || s.attendancePercentage < 75;

                  return (
                    <tr key={s._id} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand-500">
                        {s.rollNumber}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-[var(--text-primary)]">{s.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <Mail size={11} /> {s.email}
                        </p>
                        {s.phone && (
                          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                            <Phone size={11} /> {s.phone}
                          </p>
                        )}
                      </td>
                      <td className="p-3 font-mono font-semibold">
                        Sem {s.currentSemester || '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              !isShort
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-danger-600 dark:text-danger-400'
                            }`}
                          >
                            {s.attendancePercentage}%
                          </span>
                          <div className="w-16 bg-[var(--border-color)] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                !isShort ? 'bg-emerald-500' : 'bg-danger-500'
                              }`}
                              style={{ width: `${Math.min(100, s.attendancePercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {s.totalDue > 0 ? (
                          <div>
                            <span className="badge badge-danger text-[10px]">
                              ₹{s.totalDue.toLocaleString('en-IN')} Due
                            </span>
                            {s.isDefaulter && (
                              <span className="block text-[10px] text-danger-500 font-semibold mt-0.5">
                                Debarred
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-success text-[10px]">
                            Cleared (₹0)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {!isShort ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <CheckCircle2 size={13} /> 75% Safe
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-danger-500 font-semibold">
                            <AlertTriangle size={13} /> Shortage Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
