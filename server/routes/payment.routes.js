import express from 'express';
import {
  createOrder, handleWebhook, verifyPayment, getPaymentStatus,
} from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { idempotency } from '../middleware/idempotency.middleware.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Webhook uses raw body (set in server.js)
router.post('/webhook', handleWebhook);

// Protected payment routes
router.post(
  '/order',
  protect,
  authorize('student'),
  paymentLimiter,
  idempotency,
  createOrder
);

router.post(
  '/verify',
  protect,
  authorize('student'),
  verifyPayment
);

router.get(
  '/status/:orderId',
  protect,
  authorize('student'),
  getPaymentStatus
);

export default router;
