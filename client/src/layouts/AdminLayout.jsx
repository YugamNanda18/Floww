import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar.jsx';
import Navbar from '../components/shared/Navbar.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const adminNav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Students & Defaulters', href: '/admin/students', icon: 'Users' },
  { label: 'Fee Demands', href: '/admin/demands', icon: 'FileSpreadsheet' },
  { label: 'Double-Entry Ledger', href: '/admin/ledger', icon: 'BookOpen' },
  { label: 'Fee Structures', href: '/admin/fee-structure', icon: 'Grid3X3' },
  { label: 'Late Fee Rules', href: '/admin/late-fee-rules', icon: 'AlertTriangle' },
  { label: 'Installment Plans', href: '/admin/installments', icon: 'CreditCard' },
  { label: 'Caution Money', href: '/admin/caution-money', icon: 'Vault' },
  { label: 'Offline Payments', href: '/admin/offline-payments', icon: 'Banknote' },
  { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
  { label: 'Admin Staff', href: '/admin/staff', icon: 'ShieldCheck' },
  { label: 'Audit Trail', href: '/admin/audit-trail', icon: 'Shield' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar navItems={adminNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} role="admin" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} role="admin" />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
