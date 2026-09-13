import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  CreditCard,
  Clock,
  Eye,
  Users,
} from 'lucide-react';

export default function AddStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperuser = location.pathname.startsWith('/superuser');
  const basePath = isSuperuser ? '/superuser' : '/admin';

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  const [form, setForm] = useState({
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

  useEffect(() => {
    if (!isSuperuser || user?.role === 'admin') {
      toast.error('Student onboarding is strictly restricted to Academic Superusers according to their branch.');
      navigate('/admin/students', { replace: true });
    }
  }, [isSuperuser, user, navigate]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      const depts = res.data.data?.departments || res.data.data || [];
      setDepartments(depts);
      if (user?.role === 'superuser' && user?.department) {
        const userDeptId = user.department._id || user.department;
        setForm((prev) => ({ ...prev, departmentId: userDeptId }));
      } else if (depts.length > 0 && !form.departmentId) {
        setForm((prev) => ({ ...prev, departmentId: depts[0]._id }));
      }
    } catch (err) {
      toast.error('Failed to load academic departments');
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleSemesterChange = (semVal) => {
    const semNum = Math.min(Math.max(parseInt(semVal) || 1, 1), 8);
    const derivedYr = Math.ceil(semNum / 2);
    const startYr = 2025 - (derivedYr - 1);
    const endYr = startYr + 4;
    setForm((prev) => ({
      ...prev,
      currentSemester: String(semNum),
      batch: `${startYr}-${endYr}`,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.rollNumber || !form.departmentId) {
      toast.error('Name, Email, Roll Number, and Department are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/superuser/students', form);
      const studentData = res.data.data?.student || res.data.data;
      toast.success(res.data.message || `Student ${form.name} registered successfully!`);
      setCreatedStudent(studentData || { ...form });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedStudent(null);
    setForm({
      name: '',
      email: '',
      rollNumber: '',
      password: 'demo123',
      departmentId: departments[0]?._id || '',
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
  };

  const selectedDeptObj = departments.find((d) => d._id === form.departmentId);

  const presetPhotos = [
    { label: '👨🏻‍🎓 Male 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
    { label: '🧑🏽‍💻 Male 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
    { label: '👩🏻‍🎓 Female 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
    { label: '👩🏽‍💻 Female 2', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Add New Student"
        subtitle="Individual student onboarding pipeline with automated fee demand, ledger entry & CSV sync"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`${basePath}/students`)}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Directory
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/superuser/bulk-upload')}
              className="flex items-center gap-1.5"
            >
              <Users size={14} /> Bulk CSV Upload
            </Button>
          </div>
        }
      />

      {createdStudent ? (
        /* Success Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="p-8 text-center space-y-6 border-emerald-500/30 bg-emerald-500/5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <Badge variant="success" className="mb-2">Registration Successful</Badge>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{createdStudent.name}</h2>
              <p className="text-sm text-[var(--text-muted)] font-mono mt-1">Roll No: {createdStudent.rollNumber} • {createdStudent.email}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Branch / Dept</p>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{selectedDeptObj?.code || 'CSE'} — {selectedDeptObj?.name || 'Department'}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Cohort Placement</p>
                <p className="text-xs font-semibold text-brand-400">Year {Math.ceil((parseInt(form.currentSemester) || 1) / 2)} (Sem {form.currentSemester})</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Caution Deposit</p>
                <p className="text-xs font-semibold text-emerald-400">₹10,000 (Escrow)</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Real-Time Sync</p>
                <p className="text-xs font-semibold text-emerald-400">MongoDB + Redis + CSV</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={handleReset}
                className="flex items-center gap-1.5"
              >
                <UserPlus size={15} /> Add Another Student
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`${basePath}/students`)}
                className="flex items-center gap-1.5"
              >
                <Users size={15} /> View in Student Directory
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Registration Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Academic & Credentials */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">1. Academic & Credentials</h3>
                    <p className="text-xs text-[var(--text-muted)]">Assign department, semester cohort, and system access</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Vikramaditya Singh"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Roll Number (Unique ID) *</label>
                    <input
                      type="text"
                      required
                      value={form.rollNumber}
                      onChange={(e) => setForm({ ...form, rollNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. CSE2503, ECE2404"
                      className="input text-xs mt-1 w-full font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. student@college.edu"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Initial Portal Password</label>
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Default: demo123"
                      className="input text-xs mt-1 w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
                      <span>Academic Department *</span>
                      {user?.role === 'superuser' && user?.department && (
                        <span className="text-[10px] text-brand-500 font-semibold font-mono">🔒 Scoped to {user.department.name || user.department.code}</span>
                      )}
                    </label>
                    <select
                      required
                      disabled={Boolean(user?.role === 'superuser' && user?.department)}
                      value={form.departmentId}
                      onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                      className="input text-xs mt-1 w-full disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Batch Period</label>
                    <input
                      type="text"
                      value={form.batch}
                      onChange={(e) => setForm({ ...form, batch: e.target.value })}
                      placeholder="2025-2029"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Enrolled Semester</label>
                    <select
                      value={form.currentSemester}
                      onChange={(e) => handleSemesterChange(e.target.value)}
                      className="input text-xs mt-1 w-full font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem} (Year {Math.ceil(sem / 2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Real-time Cohort Derivation Banner */}
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      Auto-Configured: {selectedDeptObj?.code || 'CSE'} • Year {Math.ceil((parseInt(form.currentSemester) || 1) / 2)} (Sem {form.currentSemester}) • Batch {form.batch}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ⚡ Live MongoDB + Redis + CSV Sync
                  </span>
                </div>
              </Card>

              {/* 2. Personal & Guardian Details */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">2. Contact & Guardian Information</h3>
                    <p className="text-xs text-[var(--text-muted)]">Emergency numbers, address, and parental communication</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Blood Group</label>
                    <select
                      value={form.bloodGroup}
                      onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
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
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Full Name</label>
                    <input
                      type="text"
                      value={form.guardianName}
                      onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Guardian Contact Phone</label>
                    <input
                      type="tel"
                      value={form.guardianPhone}
                      onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                      placeholder="+91 98765 00000"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Emergency Contact</label>
                    <input
                      type="tel"
                      value={form.emergencyContact}
                      onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                      placeholder="+91 98765 11111"
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Permanent Residential Address</label>
                  <textarea
                    rows="2"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House/Street, City, State, PIN Code..."
                    className="input text-xs mt-1 w-full"
                  />
                </div>
              </Card>

              {/* 3. Photo & Bio */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">3. Photo & Academic Profile</h3>
                    <p className="text-xs text-[var(--text-muted)]">Profile avatar and background notes</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Avatar Photo URL</label>
                  <input
                    type="url"
                    value={form.profilePhoto}
                    onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })}
                    placeholder="https://images.unsplash.com/... or choose preset"
                    className="input text-xs mt-1 w-full"
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] text-[var(--text-muted)]">Presets:</span>
                    {presetPhotos.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setForm({ ...form, profilePhoto: preset.url })}
                        className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
                          form.profilePhoto === preset.url
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-semibold'
                            : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-brand-500'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Student Bio / Notes</label>
                  <textarea
                    rows="2"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Specialization, clubs, academic remarks..."
                    className="input text-xs mt-1 w-full"
                  />
                </div>
              </Card>

              {/* Action Submit */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`${basePath}/students`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  className="flex items-center gap-2 px-6"
                >
                  <UserPlus size={16} /> Register & Onboard Student
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Student Card Preview & Automated Pipelines */}
          <div className="space-y-6">
            {/* Live Card Preview */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Live Student ID Preview</h4>
                <Badge variant="info">Real-Time</Badge>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-gradient-to-b from-brand-500/5 to-transparent border border-brand-500/20">
                <img
                  src={
                    form.profilePhoto ||
                    (form.gender === 'female'
                      ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80'
                      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80')
                  }
                  alt="Student Preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500 shadow-md mb-3"
                />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {form.name || 'Student Name'}
                </h3>
                <p className="text-xs font-mono font-semibold text-brand-500 mt-0.5">
                  {form.rollNumber || 'ROLL_NUMBER'}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="default" size="sm">{selectedDeptObj?.code || 'DEPT'}</Badge>
                  <Badge variant="default" size="sm">Sem {form.currentSemester}</Badge>
                  <Badge variant="default" size="sm">{form.batch}</Badge>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                    <Mail size={12} /> Email
                  </span>
                  <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                    {form.email || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                    <Phone size={12} /> Phone
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {form.phone || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                    <Building2 size={12} /> Department
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedDeptObj?.name || '—'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Automation Pipeline Summary */}
            <Card className="p-6 space-y-4 border-brand-500/20 bg-brand-500/5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand-500" />
                <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider">
                  Automated Pipeline Triggers
                </h4>
              </div>

              <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-[var(--text-primary)]">Semester Fee Demand</strong>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Auto-computes Tuition, Library, Exam, & Development fees and raises the Semester {form.currentSemester} demand.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-[var(--text-primary)]">Double-Entry Journal Post</strong>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Debits Student Fee Receivable and Credits Tuition Income in the ledger.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-[var(--text-primary)]">Caution Money Escrow</strong>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Initializes ₹10,000 Caution Money deposit record under institutional escrow.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <strong className="text-[var(--text-primary)]">Real-Time CSV & Database Sync</strong>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Appends student to MongoDB Atlas and real-time updates data/students.csv.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
