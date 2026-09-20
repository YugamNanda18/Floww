import React, { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, LogIn, Lock, AlertCircle, ArrowLeft,
  GraduationCap, Building2, ShieldCheck, Hash, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import ThemeToggle from '../../components/ui/ThemeToggle.jsx';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlRole = searchParams.get('role');
  const urlIdentifier = searchParams.get('identifier') || searchParams.get('rollNumber') || searchParams.get('email') || '';

  const [activeRole, setActiveRole] = useState(
    ['student', 'admin', 'superuser'].includes(urlRole) ? urlRole : 'student'
  );

  const [form, setForm] = useState({ identifier: urlIdentifier, password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset or pre-fill form when role or query params change
  useEffect(() => {
    if (urlRole && ['student', 'admin', 'superuser'].includes(urlRole)) {
      setActiveRole(urlRole);
    }
    const currentId = searchParams.get('identifier') || searchParams.get('rollNumber') || searchParams.get('email');
    if (currentId) {
      setForm((prev) => ({ ...prev, identifier: currentId }));
    }
  }, [urlRole, searchParams]);

  // If already authenticated, redirect
  if (user) {
    if (user.role === 'student') {
      return <Navigate to={user.isDefaulter ? '/student/clearance' : '/student/dashboard'} replace />;
    }
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'superuser') return <Navigate to="/superuser/dashboard" replace />;
  }

  const handleRoleChange = (roleKey) => {
    setActiveRole(roleKey);
    setError('');
    setForm({ identifier: '', password: '' });
    setSearchParams({ role: roleKey });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.identifier.trim(), form.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      if (u.role === 'student') {
        navigate(u.isDefaulter ? '/student/clearance' : '/student/dashboard', { replace: true });
      } else if (u.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (u.role === 'superuser') {
        navigate('/superuser/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please check your ID and password.');
    } finally {
      setLoading(false);
    }
  };

  // Per-role config — labels, placeholders, icons, hints
  const roleConfigs = {
    student: {
      title: 'Student Portal Login',
      subtitle: 'Enter your Roll Number and password to access your fee dashboard.',
      idLabel: 'Student Roll Number',
      idPlaceholder: 'e.g. CSE2501, ECE2401, ME2301, CE2401',
      idHint: 'Your department roll number (e.g. CSE2501)',
      badge: 'Student Self-Service',
      icon: GraduationCap,
      idIcon: Hash,
    },
    admin: {
      title: 'Finance Admin Login',
      subtitle: 'Enter your Employee ID and password to manage collections and ledgers.',
      idLabel: 'Employee ID',
      idPlaceholder: 'e.g. ADM001',
      idHint: 'Your admin employee ID issued by the registrar',
      badge: 'Treasury Desk',
      icon: Building2,
      idIcon: BadgeCheck,
    },
    superuser: {
      title: 'Treasury Superuser Login',
      subtitle: 'Enter your Employee ID and password for registrar-level access.',
      idLabel: 'Employee ID',
      idPlaceholder: 'e.g. SUP001',
      idHint: 'Your superuser employee ID issued by management',
      badge: 'Registrar Master',
      icon: ShieldCheck,
      idIcon: BadgeCheck,
    },
  };

  const config = roleConfigs[activeRole] || roleConfigs.student;
  const RoleIcon = config.icon;
  const IdIcon = config.idIcon;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-150 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Navbar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Portals
        </Link>
        <ThemeToggle variant="compact" />
      </div>

      {/* Centered Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8 rounded-2xl border-[var(--border-color)] shadow-xl"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-md flex items-center justify-center p-1 mb-3">
              <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-surface-700/70 border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-secondary)] mb-2">
              <RoleIcon size={13} className="text-brand-500" />
              <span>{config.badge}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {config.title}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {config.subtitle}
            </p>
          </div>

          {/* Role Segmented Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-surface-800/80 rounded-xl border border-[var(--border-color)] mb-6 text-xs font-medium">
            {[
              { id: 'student', label: 'Student', icon: GraduationCap },
              { id: 'admin', label: 'Admin', icon: Building2 },
              { id: 'superuser', label: 'Superuser', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeRole === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRoleChange(tab.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-brand-500' : ''} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs mb-4"
              >
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">

            {/* ID Field — changes label/placeholder/icon per role */}
            <div>
              <label htmlFor="login-identifier" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {config.idLabel}
              </label>
              <div className="relative">
                <IdIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className="input pl-10 text-xs font-mono"
                  placeholder={config.idPlaceholder}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 pl-1">{config.idHint}</p>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-10 pr-10 text-xs"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:shadow-glow-brand transition-all mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <LogIn size={14} /> Sign In
                </span>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-[var(--text-muted)]">
        <p>© {new Date().getFullYear()} Floww · Double-Entry Financial Operating System</p>
      </footer>
    </div>
  );
}
