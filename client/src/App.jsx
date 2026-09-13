import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Layouts
import StudentLayout from './layouts/StudentLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import SuperuserLayout from './layouts/SuperuserLayout.jsx';

// Public Pages
import Home from './pages/public/Home.jsx';

// Auth Pages
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';

// Student Pages
import StudentDashboard from './pages/student/Dashboard.jsx';
import FeeStatement from './pages/student/FeeStatement.jsx';
import PaymentHistory from './pages/student/PaymentHistory.jsx';
import StudentReceipt from './pages/student/Receipt.jsx';
import PayFees from './pages/student/PayFees.jsx';
import DefaulterClearance from './pages/student/DefaulterClearance.jsx';
import TimetablePage from './pages/student/TimetablePage.jsx';
import AttendancePage from './pages/student/AttendancePage.jsx';
import ProfilePage from './pages/student/ProfilePage.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import Ledger from './pages/admin/Ledger.jsx';
import FeeStructurePage from './pages/admin/FeeStructure.jsx';
import LateFeeRules from './pages/admin/LateFeeRules.jsx';
import Installments from './pages/admin/Installments.jsx';
import CautionMoneyPage from './pages/admin/CautionMoney.jsx';
import OfflinePayments from './pages/admin/OfflinePayments.jsx';
import Reports from './pages/admin/Reports.jsx';
import AuditTrail from './pages/admin/AuditTrail.jsx';
import Students from './pages/admin/Students.jsx';
import AddStudent from './pages/admin/AddStudent.jsx';
import StaffManagement from './pages/admin/StaffManagement.jsx';
import Demands from './pages/admin/Demands.jsx';

// Superuser Pages
import SuperDashboard from './pages/superuser/Dashboard.jsx';
import BulkUpload from './pages/superuser/BulkUpload.jsx';
import Departments from './pages/superuser/Departments.jsx';
import Scholarships from './pages/superuser/Scholarships.jsx';
import Forecasting from './pages/superuser/Forecasting.jsx';
import SemesterStudents from './pages/superuser/SemesterStudents.jsx';
import SuperuserTimetable from './pages/superuser/SuperuserTimetable.jsx';
import SuperuserAttendance from './pages/superuser/SuperuserAttendance.jsx';

// ─── Protected Route Guards ──────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading Floww...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Defaulter gatekeeping for student role:
  // If student is marked as defaulter (has overdue dues), they are strictly redirected to /student/clearance
  if (user.role === 'student' && user.isDefaulter && location.pathname !== '/student/clearance') {
    return <Navigate to="/student/clearance" replace />;
  }

  // If student is NOT a defaulter and tries to access /student/clearance, redirect to student dashboard
  if (user.role === 'student' && !user.isDefaulter && location.pathname === '/student/clearance') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

// ─── Root Redirect ────────────────────────────────────────────────────────
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') {
    return <Navigate to={user.isDefaulter ? "/student/clearance" : "/student/dashboard"} replace />;
  }
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'superuser') return <Navigate to="/superuser/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

// ─── App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
            {/* Root / Landing Page */}
            <Route path="/" element={<Home />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Defaulter Lockout / Clearance Gateway */}
            <Route
              path="/student/clearance"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <DefaulterClearance />
                </ProtectedRoute>
              }
            />

            {/* Student Portal */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="pay" element={<PayFees />} />
              <Route path="statement" element={<FeeStatement />} />
              <Route path="history" element={<PaymentHistory />} />
              <Route path="receipts/:id" element={<StudentReceipt />} />
            </Route>

            {/* Finance Admin Portal */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'superuser']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="add-student" element={<Navigate to="/admin/students" replace />} />
              <Route path="demands" element={<Demands />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="fee-structure" element={<FeeStructurePage />} />
              <Route path="late-fee-rules" element={<LateFeeRules />} />
              <Route path="installments" element={<Installments />} />
              <Route path="caution-money" element={<CautionMoneyPage />} />
              <Route path="offline-payments" element={<OfflinePayments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-trail" element={<AuditTrail />} />
              <Route path="staff" element={<StaffManagement />} />
            </Route>

            {/* Superuser Portal */}
            <Route path="/superuser" element={
              <ProtectedRoute allowedRoles={['superuser']}>
                <SuperuserLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SuperDashboard />} />
              <Route path="semester-students" element={<SemesterStudents />} />
              <Route path="timetable" element={<SuperuserTimetable />} />
              <Route path="attendance" element={<SuperuserAttendance />} />
              <Route path="bulk-upload" element={<BulkUpload />} />
              <Route path="departments" element={<Departments />} />
              <Route path="scholarships" element={<Scholarships />} />
              <Route path="forecasting" element={<Forecasting />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="students" element={<SemesterStudents />} />
              <Route path="add-student" element={<AddStudent />} />
              <Route path="demands" element={<Demands />} />
              <Route path="fee-structure" element={<FeeStructurePage />} />
              <Route path="late-fee-rules" element={<LateFeeRules />} />
              <Route path="offline-payments" element={<OfflinePayments />} />
              <Route path="caution-money" element={<CautionMoneyPage />} />
              <Route path="installments" element={<Installments />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-trail" element={<AuditTrail />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <div className="h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-6xl font-bold gradient-text">404</h1>
                <p className="text-slate-500">Page not found</p>
                <a href="/" className="btn-primary btn">Go Home</a>
              </div>
            } />
          </Routes>
          </ErrorBoundary>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
