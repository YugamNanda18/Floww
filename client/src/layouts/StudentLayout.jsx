import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar.jsx';
import Navbar from '../components/shared/Navbar.jsx';
import AIConcierge from '../components/shared/AIConcierge.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const studentNav = [
  { label: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Profile', href: '/student/profile', icon: 'User' },
  { label: 'Attendance & 75%', href: '/student/attendance', icon: 'UserCheck' },
  { label: 'Timetable', href: '/student/timetable', icon: 'Calendar' },
  { label: 'Pay Online', href: '/student/pay', icon: 'CreditCard' },
  { label: 'Fee Statement', href: '/student/statement', icon: 'FileText' },
  { label: 'Payment History', href: '/student/history', icon: 'Receipt' },
];

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar navItems={studentNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} role="student" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} role="student" />
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
      <AIConcierge />
    </div>
  );
}
