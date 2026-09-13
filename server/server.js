import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db.js';
import './models/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initLateFeeJob } from './jobs/lateFee.job.js';
import { initReminderJob } from './jobs/feeReminder.job.js';
import { syncStudentsToCsv } from './utils/csvSync.js';
import { syncAllStudentsToRedis } from './services/redisSync.service.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import reportRoutes from './routes/report.routes.js';
import superuserRoutes from './routes/superuser.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(morgan('dev'));
app.use(cookieParser());

// NOTE: Razorpay webhook needs raw body for HMAC verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/superuser', superuserRoutes);
app.use('/api/ai', aiRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  service: 'Floww API',
  timestamp: new Date().toISOString(),
}));

// ─── Error Handler ────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────
const bootstrap = async () => {
  await connectDB();
  await syncStudentsToCsv().catch((err) => console.error('Initial CSV Sync Error:', err.message));

  // Start BullMQ background jobs only if Redis is available
  try {
    const { Redis } = await import('ioredis');
    const testClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, {
          connectTimeout: 2000,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
          lazyConnect: true,
        })
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          connectTimeout: 2000,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
          lazyConnect: true,
        });

    await testClient.connect();
    testClient.disconnect();
    console.log('✅ Redis is online. Initializing BullMQ jobs...');
    initLateFeeJob();
    initReminderJob();
    await syncAllStudentsToRedis().catch((err) => console.error('Initial Redis Warmup Error:', err.message));
  } catch (err) {
    console.warn('⚠️  Redis is offline. BullMQ background jobs (late fees & reminders) are in standby mode.');
    console.warn('   (Floww is fully functional in standalone mode)');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Floww API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}\n`);
  });
};

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default app;
