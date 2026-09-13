import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/shared/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  Shield,
  UserPlus,
  Building2,
  Mail,
  Phone,
  Key,
  CheckCircle2,
  X,
  Search,
  Lock,
  Crown,
  Edit2,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  Sparkles,
} from 'lucide-react';

export default function StaffManagement() {
  const { user } = useAuth();
  const location = useLocation();
  const isSuper = location.pathname.startsWith('/superuser');

  const isMainAdmin = !isSuper && (
    user?.role === 'admin' ||
    user?.employeeId?.toUpperCase() === 'ADM001' ||
    user?.email?.toLowerCase() === 'admin@demo.com'
  );

  const isDeanSuperuser = isSuper && (
    user?.employeeId?.toUpperCase() === 'SUP001' ||
    user?.email?.toLowerCase() === 'super@demo.com' ||
    (!user?.department && user?.role === 'superuser')
  );

  const canManageStaff = isSuper ? isDeanSuperuser : isMainAdmin;

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Quick Inline Onboarding Form
  const [showQuickForm, setShowQuickForm] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    departmentId: '',
    phone: '',
    password: 'admin123',
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    isActive: true,
    password: '',
  });

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, [isSuper]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      if (isSuper) {
        const res = await api.get('/superuser/staff');
        setStaff(res.data.data?.superusers || []);
      } else {
        const res = await api.get('/admin/staff');
        setStaff(res.data.data?.admins || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch staff directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      const depts = res.data.data?.departments || res.data.data || [];
      setDepartments(depts);
      if (depts.length > 0 && !form.departmentId) {
        setForm(f => ({ ...f, departmentId: depts[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load departments:', err.message);
    }
  };

  // ─── ADD STAFF ────────────────────────────────────────────────────────
  const handleAddSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canManageStaff) {
      toast.error(isSuper ? 'Only the Main Superuser (Institutional Dean) can create superusers.' : 'Only Main Admin can create admins.');
      return;
    }
    if (!form.name || !form.email) {
      toast.error('Name and Official Email are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSuper) {
        const res = await api.post('/superuser/create-superuser', {
          name: form.name.trim(),
          email: form.email.trim(),
          employeeId: form.employeeId ? form.employeeId.trim().toUpperCase() : undefined,
          departmentId: form.departmentId || null,
          phone: form.phone.trim(),
          password: form.password || 'admin123',
        });
        toast.success(res.data.message || 'New Superuser created successfully!');
      } else {
        const res = await api.post('/admin/create-admin', {
          name: form.name.trim(),
          email: form.email.trim(),
          employeeId: form.employeeId ? form.employeeId.trim().toUpperCase() : undefined,
          phone: form.phone.trim(),
          password: form.password || 'admin123',
        });
        toast.success(res.data.message || 'New Finance Admin created successfully!');
      }

      setForm({
        name: '',
        email: '',
        employeeId: '',
        departmentId: departments[0]?._id || '',
        phone: '',
        password: 'admin123',
      });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── EDIT STAFF ────────────────────────────────────────────────────────
  const openEditModal = (member) => {
    if (!canManageStaff) {
      toast.error('Access Denied: Only the Main Superuser can modify superusers.');
      return;
    }
    setEditingStaff(member);
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      departmentId: member.department?._id || member.department || '',
      isActive: member.isActive !== false,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;

    setSubmitting(true);
    try {
      if (isSuper) {
        const res = await api.put(`/superuser/superusers/${editingStaff._id}`, {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          departmentId: editForm.departmentId || null,
          isActive: editForm.isActive,
          password: editForm.password ? editForm.password.trim() : undefined,
        });
        toast.success(res.data.message || 'Superuser details updated successfully!');
      } else {
        const res = await api.put(`/admin/admins/${editingStaff._id}`, {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          isActive: editForm.isActive,
          password: editForm.password ? editForm.password.trim() : undefined,
        });
        toast.success(res.data.message || 'Admin details updated successfully!');
      }

      setShowEditModal(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE STAFF ──────────────────────────────────────────────────────
  const openDeleteModal = (member) => {
    if (!canManageStaff) {
      toast.error('Access Denied: Only the Main Superuser can delete superusers.');
      return;
    }
    setDeletingStaff(member);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingStaff) return;
    setDeleting(true);
    try {
      if (isSuper) {
        const res = await api.delete(`/superuser/superusers/${deletingStaff._id}`);
        toast.success(res.data.message || 'Superuser removed successfully!');
      } else {
        const res = await api.delete(`/admin/admins/${deletingStaff._id}`);
        toast.success(res.data.message || 'Admin removed successfully!');
      }
      setShowDeleteModal(false);
      setDeletingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff member');
    } finally {
      setDeleting(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.employeeId?.toLowerCase().includes(q) ||
      s.scope?.toLowerCase().includes(q) ||
      s.department?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title={isSuper ? 'Superuser Staff & Academic Governance' : 'Main Admin Console & Governance'}
        subtitle={
          isSuper
            ? (isDeanSuperuser
                ? 'Main Superuser (Dean SUP001) has master authority to provision, configure, and remove academic superusers branch-wise.'
                : 'Department staff directory for your branch. Administrative changes are strictly centralized to the Institutional Dean.')
            : 'Master Admin (ADM001) has full authority to onboard, update, reset credentials, and remove Finance Admins.'
        }
        action={
          canManageStaff ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowQuickForm(!showQuickForm)}
              className="flex items-center gap-1.5"
            >
              <UserPlus size={15} />
              {showQuickForm ? 'Hide Onboarding Form' : isSuper ? '+ Onboard Superuser (Branch-Wise)' : '+ Onboard New Admin'}
            </Button>
          ) : (
            <span className="badge badge-info flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
              <Shield size={14} /> Directory View Only
            </span>
          )
        }
      />

      {/* ─── GOVERNANCE NOTICE FOR BRANCH SUPERUSERS ────────────────────── */}
      {isSuper && !isDeanSuperuser && (
        <Card className="p-5 bg-amber-500/10 border-amber-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Academic Governance: Centralized Superuser Management
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Superuser creation, role assignment, and branch allocations are strictly centralized to the Main Superuser (Institutional Dean SUP001). Branch superusers hold read-only staff directory privileges.
                </p>
              </div>
            </div>
            <Badge variant="warning">Dean Authority Protected</Badge>
          </div>
        </Card>
      )}

      {/* ─── DEDICATED HIGH-VISIBILITY ONBOARDING PANEL (MAIN ONLY) ─────── */}
      <AnimatePresence>
        {showQuickForm && canManageStaff && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border-brand-500/30 bg-brand-500/5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/30">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {isSuper ? 'Onboard New Academic Superuser (Branch-Wise)' : 'Onboard New Finance Administrator'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {isSuper
                        ? 'Dean (SUP001) can provision branch superusers with immediate login credentials and department assignment'
                        : 'Main Admin (ADM001) can create additional Finance Admins with full system access'}
                    </p>
                  </div>
                </div>
                <Badge variant={isSuper ? 'warning' : 'brand'}>
                  {isSuper ? 'Dean Authority' : 'Main Admin Authority'}
                </Badge>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder={isSuper ? 'e.g. Prof. Arvind Menon' : 'e.g. Ramesh Chandra'}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Official Email *</label>
                    <input
                      type="email"
                      required
                      placeholder={isSuper ? 'super.branch@demo.com' : 'admin.new@demo.com'}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Staff ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder={isSuper ? 'e.g. SUP-CSE or Auto' : 'e.g. ADM003 or Auto'}
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value.toUpperCase() })}
                      className="input text-xs mt-1 w-full font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  {isSuper ? (
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">
                        Branch-Wise Assignment (Department) *
                      </label>
                      <select
                        value={form.departmentId}
                        onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                        className="input text-xs mt-1 w-full font-semibold"
                      >
                        <option value="">🌐 Centralized Dean (All Departments)</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            🏢 {d.name} ({d.code}) Branch
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Institutional Scope</label>
                      <div className="p-2 mt-1 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                        <Shield size={12} />
                        <span>Institutional (All Academic Departments)</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Default Password</label>
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="admin123"
                      className="input text-xs mt-1 w-full font-mono"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    className="w-full flex items-center justify-center gap-2 h-9"
                  >
                    <Sparkles size={14} />
                    {isSuper ? 'Register New Superuser' : 'Register New Admin'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            {isSuper ? <Crown size={24} /> : <Shield size={24} />}
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {isSuper ? 'Active Superusers' : 'Active Finance Admins'}
            </p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{staff.length}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {isSuper ? 'Academic Scope' : 'Finance Authority'}
            </p>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              {isSuper ? (user?.department ? 'Branch Scoped' : 'Centralized Dean (Multi-Branch)') : 'Universal (All Departments)'}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <Lock size={24} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Governance Model</p>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              {isSuper ? 'Dean & Branch Management' : 'Main Admin (ADM001) Master'}
            </h3>
          </div>
        </Card>
      </div>

      {/* Staff Directory Table Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name, staff ID, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {filteredStaff.length} of {staff.length} staff members
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-b border-[var(--border-color)] font-semibold">
              <tr>
                <th className="p-3">Staff ID</th>
                <th className="p-3">Name & Contact</th>
                <th className="p-3">Role & Scope</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                    No staff members found matching search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const isThisMainAdmin = member.employeeId === 'ADM001';
                  const isThisCentralSuper = member.employeeId === 'SUP001';

                  return (
                    <tr
                      key={member._id}
                      className="hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--text-primary)]">
                          {isThisMainAdmin ? (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Crown size={14} /> {member.employeeId}
                            </span>
                          ) : isThisCentralSuper ? (
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400">
                              <Crown size={14} /> {member.employeeId}
                            </span>
                          ) : (
                            member.employeeId || 'N/A'
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-[var(--text-primary)]">{member.name}</div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-brand-500" />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-emerald-500" />
                              {member.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {isThisMainAdmin ? (
                            <span className="badge badge-warning text-[10px] px-2 py-0.5 font-bold flex items-center gap-1">
                              <Crown size={11} /> Master Admin (CFO)
                            </span>
                          ) : isThisCentralSuper ? (
                            <span className="badge badge-brand text-[10px] px-2 py-0.5 font-bold flex items-center gap-1">
                              <Crown size={11} /> Centralized Superuser (Dean)
                            </span>
                          ) : member.role === 'superuser' ? (
                            <Badge variant="warning" size="sm">
                              {member.department ? `${member.department.code} Branch Superuser` : 'Superuser'}
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Finance Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
                          {member.scope}
                        </p>
                      </td>

                      <td className="p-3">
                        {member.department ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-brand-500" />
                            <span className="font-semibold">{member.department.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">({member.department.code})</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic font-semibold">
                            Universal (All Departments)
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {member.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-semibold">
                            <X size={12} /> Deactivated
                          </span>
                        )}
                      </td>

                      {/* Action Buttons (Edit & Delete - Main Superuser / Main Admin Only) */}
                      <td className="p-3 text-right">
                        {!canManageStaff ? (
                          <span className="text-[11px] text-[var(--text-muted)] italic font-semibold">
                            Directory View
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(member)}
                              title="Edit Staff Details & Password"
                              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-brand-500 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>

                            {isThisMainAdmin || isThisCentralSuper ? (
                              <span
                                title="Master Anchor Account cannot be removed"
                                className="p-1.5 rounded-lg border border-[var(--border-color)] opacity-40 cursor-not-allowed text-[var(--text-muted)] inline-flex items-center"
                              >
                                <Lock size={13} />
                              </span>
                            ) : (
                              <button
                                onClick={() => openDeleteModal(member)}
                                title="Delete Account"
                                className="p-1.5 rounded-lg border border-danger-500/20 hover:bg-danger-500/10 text-danger-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
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

      {/* ─── EDIT STAFF MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Edit2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Edit Staff: {editingStaff.employeeId} ({editingStaff.name})
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Update personal info, department, active status, or reset password
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
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
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Official Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input text-xs mt-1 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="input text-xs mt-1 w-full"
                  />
                </div>

                {isSuper && isDeanSuperuser && (
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Department Assignment
                    </label>
                    <select
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                      className="input text-xs mt-1 w-full"
                    >
                      <option value="">🌐 Universal — Master Superuser / Dean</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          🏢 {d.name} ({d.code}) Branch
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Toggle */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Account Status</label>
                  {editingStaff.employeeId === 'ADM001' || editingStaff.employeeId === 'SUP001' ? (
                    <div className="p-2.5 mt-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Lock size={13} />
                      <span>Master Anchor account status is permanently Active.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, isActive: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          editForm.isActive
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <CheckCircle2 size={13} /> Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, isActive: false })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          !editForm.isActive
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <X size={13} /> Deactivated
                      </button>
                    </div>
                  )}
                </div>

                {/* Reset Password */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="input text-xs mt-1 w-full font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Enter a new password if you want to reset this user's portal credentials.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowEditModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && deletingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-danger-500/30 rounded-2xl shadow-2xl p-6 text-[var(--text-primary)] space-y-4"
            >
              <div className="flex items-center gap-3 text-danger-500">
                <div className="w-10 h-10 rounded-xl bg-danger-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Delete Staff Account
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Permanent Action</p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-[var(--text-primary)]">{deletingStaff.name}</strong> (
                <span className="font-mono text-brand-500 font-bold">{deletingStaff.employeeId}</span>)?
                Their login access and portal permissions will be completely revoked.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={deleting}
                  onClick={handleDeleteSubmit}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Confirm Deletion
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
