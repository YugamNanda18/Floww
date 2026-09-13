import express from 'express';
import {
  getStudentDashboard, getStudentDemands, getDemandById,
  getStudentReceipts, getReceiptById, verifyReceipt,
  resolveDefaulterClearance,
  getStudentTimetable, getStudentAttendance,
  getStudentProfile, updateStudentProfile,
} from '../controllers/student.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.get('/dashboard', getStudentDashboard);
router.post('/clearance/resolve', resolveDefaulterClearance);
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);
router.get('/timetable', getStudentTimetable);
router.get('/attendance', getStudentAttendance);
router.get('/demands', getStudentDemands);
router.get('/demands/:id', getDemandById);
router.get('/receipts', getStudentReceipts);
router.get('/receipts/:id', getReceiptById);
router.get('/receipts/:receiptNumber/verify', verifyReceipt);

export default router;
