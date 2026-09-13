import express from 'express';
import {
  getSuperuserAnalytics, getForecasting,
  bulkUploadStudents, promoteStudents,
  getAllDepartments, createDepartment,
} from '../controllers/bulk.controller.js';
import { bulkRaiseDemands } from '../controllers/adminStudent.controller.js';
import { getSuperusers, createSuperuser, updateSuperuser, deleteSuperuser } from '../controllers/staff.controller.js';
import {
  getSemesterStudents,
  getSuperuserTimetable,
  saveSuperuserTimetable,
  getSuperuserAttendance,
  updateSuperuserAttendance,
} from '../controllers/superuserAcademic.controller.js';
import { createStudent } from '../controllers/adminStudent.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

router.use(protect, authorize('superuser'));

router.get('/analytics', getSuperuserAnalytics);
router.get('/forecasting', getForecasting);
router.post('/bulk-upload', upload.single('file'), bulkUploadStudents);
router.post('/bulk-promote', promoteStudents);
router.post('/raise-demands', bulkRaiseDemands);
router.get('/departments', getAllDepartments);
router.post('/departments', createDepartment);

// Superuser Staff Management (Scoped to branch if branch superuser; full control for SUP001)
router.get('/staff', getSuperusers);
router.post('/create-superuser', createSuperuser);
router.put('/superusers/:id', updateSuperuser);
router.delete('/superusers/:id', deleteSuperuser);

// Superuser Academic Governance (Branch-scoped semester students, timetables, and attendance)
router.get('/semester-students', getSemesterStudents);
router.get('/timetable', getSuperuserTimetable);
router.post('/timetable', saveSuperuserTimetable);
router.get('/attendance', getSuperuserAttendance);
router.post('/attendance/update', updateSuperuserAttendance);

// Superuser Student Onboarding (Scoped to department for branch superusers)
router.post('/students', createStudent);

export default router;

