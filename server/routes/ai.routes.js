import express from 'express';
import { handleChat } from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/chat', protect, apiLimiter, handleChat);

export default router;
