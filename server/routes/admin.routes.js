import express from 'express';
import {
  getAdminDashboard,
  getFeeStructures, createFeeStructure, updateFeeStructure, publishFeeStructure,
  getLateFeeRules, createLateFeeRule, updateLateFeeRule, deleteLateFeeRule,
  getInstallments, createInstallmentPlan,
  getCautionMoney, disburseCautionMoney,
  getOfflinePayments, submitOfflinePayment, approveOfflinePayment, rejectOfflinePayment,
  applyScholarship, waiveLateFee,
  getAuditTrail,
  getDepartments,
} from '../controllers/feeStructure.controller.js';
import { getAuditLogs } from '../controllers/audit.controller.js';
import {
  getAdminStudents,
  getStudentFinancialHistory,
  getAdminDemands,
  raiseIndividualDemand,
  createStudent,
  updateStudentByAdmin,
  triggerMassDueReminders,
  triggerIndividualDueReminder,
} from '../controllers/adminStudent.controller.js';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../controllers/staff.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, authorize('admin', 'superuser'));

router.get('/dashboard', getAdminDashboard);
router.get('/departments', getDepartments);

// Staff Administration (Only Main Admin ADM001 can create, update, or delete Admins)
router.get('/staff', getAdmins);
router.post('/create-admin', authorize('admin'), createAdmin);
router.put('/admins/:id', authorize('admin'), updateAdmin);
router.delete('/admins/:id', authorize('admin'), deleteAdmin);

// Students & Defaulters (Admissions restricted to Superuser; Admin manages fees)
router.get('/students', getAdminStudents);
router.post('/students', authorize('superuser'), createStudent);
router.put('/students/:id', updateStudentByAdmin);
router.get('/students/:id/history', getStudentFinancialHistory);
router.post('/reminders/send-all', triggerMassDueReminders);
router.post('/reminders/send-student/:id', triggerIndividualDueReminder);

// Fee Demands
router.get('/demands', getAdminDemands);
router.post('/demands/raise', raiseIndividualDemand);

// Fee Structures
router.get('/fee-structures', getFeeStructures);
router.post('/fee-structures', createFeeStructure);
router.patch('/fee-structures/:id', updateFeeStructure);
router.post('/fee-structures/:id/publish', publishFeeStructure);

// Late Fee Rules
router.get('/late-fee-rules', getLateFeeRules);
router.post('/late-fee-rules', createLateFeeRule);
router.patch('/late-fee-rules/:id', updateLateFeeRule);
router.delete('/late-fee-rules/:id', deleteLateFeeRule);

// Installment Plans
router.get('/installments', getInstallments);
router.post('/installments', createInstallmentPlan);

// Caution Money
router.get('/caution-money', getCautionMoney);
router.post('/caution-money/disburse', disburseCautionMoney);

// Offline Payments
router.get('/offline-payments', getOfflinePayments);
router.post('/offline-payments', submitOfflinePayment);
router.patch('/offline-payments/:id/approve', approveOfflinePayment);
router.patch('/offline-payments/:id/reject', rejectOfflinePayment);

// Financial Overrides
router.post('/scholarships/apply', applyScholarship);
router.post('/waivers/late-fee', waiveLateFee);

// Audit
router.get('/audit-trail', getAuditLogs);

export default router;
