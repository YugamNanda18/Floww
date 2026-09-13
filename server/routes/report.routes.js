import express from 'express';
import { getBalanceSheet, getCollectionReport, getRevenueReport } from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, authorize('admin', 'superuser'));

router.get('/balance-sheet', getBalanceSheet);
router.get('/collection', getCollectionReport);
router.get('/revenue', getRevenueReport);

export default router;
