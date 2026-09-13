import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, ShieldCheck, Mail, Phone, MapPin, Calendar, Droplet,
  GraduationCap, Building2, CheckCircle2, AlertTriangle, QrCode,
  Sparkles, Camera, Edit3, Save, X, RefreshCw, Heart, Award
} from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

const MALE_AVATARS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
];

const FEMALE_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    phone: '',
    guardianName: '',
    guardianPhone: '',
    emergencyContact: '',
    address: '',
    bio: '',
    dob: '',
    bloodGroup: '',
    profilePhoto: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/profile');
      const data = res.data.data;
      setProfileData(data);
      if (data.student) {
        setForm({
          phone: data.student.phone || '',
          guardianName: data.student.guardianName || '',
          guardianPhone: data.student.guardianPhone || '',
          emergencyContact: data.student.emergencyContact || '',
          address: data.student.address || '',
          bio: data.student.bio || '',
          dob: data.student.dob || '',
          bloodGroup: data.student.bloodGroup || '',
          profilePhoto: data.student.profilePhoto || '',
        });
      }
    } catch {
      toast.error('Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/student/profile', form);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setShowPhotoModal(false);
      setProfileData((prev) => ({
        ...prev,
        student: { ...prev.student, ...res.data.data },
      }));
      if (setUser) {
        setUser((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const selectPhoto = (url) => {
    setForm((prev) => ({ ...prev, profilePhoto: url }));
  };

  if (loading) return <PageSpinner />;

  const student = profileData?.student || user;
  const gender = student?.gender || 'male';
  const availableAvatars = gender === 'female' ? FEMALE_AVATARS : MALE_AVATARS;
  const attendancePct = profileData?.academicSummary?.attendancePercentage ?? 85;
  const isAttendanceSafe = attendancePct >= 75;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Student Identity & Academic Profile"
        subtitle="Manage your personal credentials, digital identity pass, and institutional records on Floww."
        breadcrumbs={['Student Portal', 'My Profile']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── Column 1: Animated 3D Digital Student Identity Pass ─── */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm relative group perspective-1000"
          >
            {/* Holographic Ambient Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />

            {/* Smart Card Container */}
            <div className="relative rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Holographic Shimmer Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
              
              {/* Top Bar: Institute Branding */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-white/20 shadow-md flex items-center justify-center p-0.5 shrink-0">
                    <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-wider uppercase text-white/90">
                      Floww University
                    </h3>
                    <p className="text-[9px] text-sky-400 font-semibold uppercase tracking-widest">
                      Digital Student Identity Pass
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </div>
              </div>

              {/* Photo & Primary Bio */}
              <div className="mt-5 flex items-center gap-4">
                <div className="relative group/avatar shrink-0">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 shadow-xl bg-slate-800">
                    <img
                      src={student?.profilePhoto || form.profilePhoto || availableAvatars[0]}
                      alt={student?.name}
                      className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <button
                    onClick={() => setShowPhotoModal(true)}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition-colors"
                    title="Change Photo"
                  >
                    <Camera size={13} />
                  </button>
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white truncate tracking-tight">
                    {student?.name}
                  </h2>
                  <p className="font-mono text-xs font-bold text-sky-300">
                    {student?.rollNumber || 'CSE2501'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10">
                      {gender === 'female' ? '♀ Female' : '♂ Male'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-500/30">
                      Sem {student?.currentSemester || 1}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                      {student?.bloodGroup || 'O+'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Details Strip */}
              <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Department</p>
                  <p className="font-bold text-white/90 mt-0.5 truncate">
                    {student?.department?.name || student?.department?.code || 'Computer Science'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Batch Cohort</p>
                  <p className="font-bold text-white/90 mt-0.5">
                    {student?.batch || '2025-2029'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Date of Birth</p>
                  <p className="font-medium text-white/80 mt-0.5 font-mono">
                    {student?.dob || '2006-08-14'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">75% Attendance</p>
                  <p className={`font-bold mt-0.5 ${isAttendanceSafe ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {attendancePct}% ({isAttendanceSafe ? 'Compliant' : 'Shortage'})
                  </p>
                </div>
              </div>

              {/* Bottom Card Barcode & QR Stamp */}
              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-white text-slate-900">
                    <QrCode size={26} />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-white/50">FLOWW-PASS-NFC</p>
                    <p className="font-mono text-[9px] text-emerald-400 font-bold">CRYPTO-VERIFIED</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] tracking-widest text-white/40">
                    ||||| ||| ||||||| |||
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Photo Switcher Button */}
          <div className="mt-4 w-full max-w-sm flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPhotoModal(true)}
              className="w-full text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Camera size={14} className="text-brand-500" />
              <span>Customize Profile Avatar & Photo</span>
            </Button>
          </div>
        </div>

        {/* ─── Column 2: Personal, Academic, & Guardian Details ─── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status & Compliance Quick Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isAttendanceSafe
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium">75% Attendance Health</p>
                  <h4 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {attendancePct}% Overall
                  </h4>
                </div>
              </div>
              <Badge variant={isAttendanceSafe ? 'success' : 'warning'}>
                {isAttendanceSafe ? 'Safe' : 'Shortage'}
              </Badge>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Fee Clearance Status</p>
                  <h4 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {student?.isDefaulter ? 'Defaulter Hold' : 'All Clear'}
                  </h4>
                </div>
              </div>
              <Badge variant={student?.isDefaulter ? 'danger' : 'success'}>
                {student?.isDefaulter ? 'Overdue' : 'Compliant'}
              </Badge>
            </Card>
          </div>

          {/* Profile Details Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Personal & Institutional Records
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Verified student credentials and communication records
                </p>
              </div>

              {!isEditing ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  <span>Edit Details</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    loading={saving}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Save size={13} />
                    <span>Save Changes</span>
                  </Button>
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={student?.name || ''}
                    className="input text-xs bg-[var(--bg-base)]/50 cursor-not-allowed text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    University Roll Number
                  </label>
                  <input
                    type="text"
                    disabled
                    value={student?.rollNumber || ''}
                    className="input text-xs font-mono bg-[var(--bg-base)]/50 cursor-not-allowed text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={student?.email || ''}
                    className="input text-xs bg-[var(--bg-base)]/50 cursor-not-allowed text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Student Contact Phone
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98XXX XXXXX"
                    className={`input text-xs ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className={`input text-xs font-mono ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    placeholder="e.g. O+, B+, A+"
                    className={`input text-xs ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Father / Guardian Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    placeholder="Guardian full name"
                    className={`input text-xs ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Guardian Contact Phone
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={form.guardianPhone}
                    onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                    placeholder="+91 98XXX XXXXX"
                    className={`input text-xs ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Complete permanent residential address"
                  className={`input text-xs py-2 ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Student Bio / Academic Focus
                </label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell us about your academic pursuits, interests, and aspirations..."
                  className={`input text-xs py-2 ${!isEditing ? 'bg-[var(--bg-base)]/50' : ''}`}
                />
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* ─── Modal: Gender-Based Photo & Avatar Picker ─── */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="card max-w-lg w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-brand-500" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Select Profile Avatar ({gender === 'female' ? 'Female' : 'Male'})
                  </h3>
                </div>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Choose from curated high-definition portraits tailored for your student profile, or paste a custom image URL below.
              </p>

              {/* Portrait Grid */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {availableAvatars.map((url, idx) => {
                  const isSelected = form.profilePhoto === url;
                  return (
                    <div
                      key={idx}
                      onClick={() => selectPhoto(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                        isSelected
                          ? 'border-brand-500 ring-2 ring-brand-500/30 scale-105'
                          : 'border-transparent hover:border-slate-300 dark:hover:border-surface-600'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                          <CheckCircle2 size={20} className="text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom Image URL Option */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Or Enter Custom Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={form.profilePhoto}
                  onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <Button variant="ghost" size="sm" onClick={() => setShowPhotoModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  Apply & Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
