import React from 'react';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import { motion } from 'framer-motion';

const roleBadgeClass = {
  student: 'badge-brand',
  admin: 'badge-success',
  superuser: 'badge-info',
};

export default function Navbar({ onMenuClick, role }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 flex items-center px-4 lg:px-6 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex-shrink-0">
      {/* Mobile menu */}
      <button
        id="mobile-menu-btn"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-700 mr-2 transition-colors"
      >
        <Menu size={20} className="text-slate-600 dark:text-slate-400" />
      </button>

      {/* Page title area */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          id="notifications-btn"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors relative"
        >
          <Bell size={18} className="text-slate-600 dark:text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-surface-600 mx-1" />

        {/* User + role */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{user?.name}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {user?.department?.code && user?.role === 'superuser' && (
                <span className="badge badge-brand text-[9px] px-1 py-0 font-mono font-bold">
                  {user.department.code}
                </span>
              )}
              <span className={`badge ${roleBadgeClass[role] || 'badge-neutral'} text-[10px] px-1.5 py-0`}>
                {user?.department?.code && user?.role === 'superuser' ? `${user.department.code} Branch Superuser` : role}
              </span>
            </div>
          </div>
          {user?.role === 'student' ? (
            <a
              href="/student/profile"
              title="View Profile"
              className="relative group transition-transform hover:scale-105"
            >
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-sidebar)] rounded-full" />
            </a>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase()
              )}
            </div>
          )}
        </div>

        <button
          id="logout-btn"
          onClick={logout}
          className="p-2 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:text-danger-500 text-slate-500 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
