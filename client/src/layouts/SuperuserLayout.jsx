import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar.jsx';
import Navbar from '../components/shared/Navbar.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const superuserNav = [
  { label: 'Analytics & KPIs', href: '/superuser/dashboard', icon: 'BarChart3' },
  { label: 'Semester Students', href: '/superuser/semester-students', icon: 'Users' },
  { label: 'Add Student', href: '/superuser/add-student', icon: 'UserPlus' },
  { label: 'Academic Timetable', href: '/superuser/timetable', icon: 'Calendar' },
  { label: 'Attendance & 75% Gate', href: '/superuser/attendance', icon: 'UserCheck' },
  { label: 'Department Staff', href: '/superuser/staff', icon: 'Crown' },
  { label: 'Bulk Operations', href: '/superuser/bulk-upload', icon: 'Upload' },
  { label: 'Departments', href: '/superuser/departments', icon: 'Building2' },
  { label: 'Scholarships', href: '/superuser/scholarships', icon: 'GraduationCap' },
  { label: 'Revenue Forecast', href: '/superuser/forecasting', icon: 'TrendingUp' },
];

export default function SuperuserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar navItems={superuserNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} role="superuser" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} role="superuser" />
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
