import express from 'express';
import { getInstituteLedgerHandler, getStudentLedgerHandler } from '../controllers/ledger.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Admin: full institute ledger
router.get('/', authorize('admin', 'superuser'), getInstituteLedgerHandler);

// Student: own ledger
router.get('/my', authorize('student'), getStudentLedgerHandler);

// Admin: specific student's ledger
router.get('/student/:studentId', authorize('admin', 'superuser'), getStudentLedgerHandler);

export default router;
