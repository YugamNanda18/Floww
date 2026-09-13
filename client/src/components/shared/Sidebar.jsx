import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { X } from 'lucide-react';

const roleMeta = {
  student: { label: 'Student Portal', color: 'text-brand-400' },
  admin: { label: 'Finance Admin', color: 'text-emerald-400' },
  superuser: { label: 'Superuser Hub', color: 'text-violet-400' },
};

export default function Sidebar({ navItems, open, onClose, role }) {
  const { user } = useAuth();
  const location = useLocation();
  const meta = roleMeta[role] || roleMeta.student;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Brand */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-center p-0.5 shrink-0">
            <img src="/floww-logo.png" alt="Floww" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm tracking-tight flex items-center gap-1.5">
              Floww
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-500">v2.0</span>
            </p>
            <p className={`text-xs font-medium ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = Icons[item.icon] || Icons.Circle;
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={() =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-dot"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="p-4 border-t border-[var(--border-color)]">
          <NavLink
            to={user.role === 'student' ? '/student/profile' : '#'}
            className="flex items-center gap-3 p-1.5 -m-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors group"
          >
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-brand-500 transition-colors">
                {user.name}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
          </NavLink>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-60 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] lg:hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-700"
              >
                <X size={18} className="text-slate-500" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
