import { Queue, Worker } from 'bullmq';
import { getBullMQConnection } from '../config/redis.js';
import { sendDueReminder } from '../services/notification.service.js';
import FeeDemand from '../models/FeeDemand.js';
import User from '../models/User.js';

const QUEUE_NAME = 'fee-reminders';

let queue = null;
let worker = null;

const processFeeReminders = async () => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find demands due in the next 3 days, not yet paid
  const upcomingDemands = await FeeDemand.find({
    dueDate: { $gte: now, $lte: threeDaysFromNow },
    status: { $in: ['pending', 'partial'] },
  }).populate('student', 'name email');

  for (const demand of upcomingDemands) {
    if (!demand.student?.email) continue;
    try {
      await sendDueReminder({
        to: demand.student.email,
        name: demand.student.name,
        amount: demand.outstandingAmount,
        dueDate: demand.dueDate,
        semester: demand.semester,
      });
    } catch (err) {
      console.error(`[ReminderJob] Failed to send to ${demand.student.email}:`, err.message);
    }
  }

  return { sent: upcomingDemands.length };
};

export const initReminderJob = () => {
  try {
    const connection = getBullMQConnection();

    queue = new Queue(QUEUE_NAME, { connection });

    // Run every day at 9 AM
    queue.add(
      'send-reminders',
      {},
      {
        repeat: { cron: '0 9 * * *' },
        removeOnComplete: 20,
        removeOnFail: 10,
      }
    );

    worker = new Worker(
      QUEUE_NAME,
      async () => processFeeReminders(),
      { connection }
    );

    worker.on('completed', (job, result) => {
      console.log(`[ReminderJob] Sent ${result.sent} reminders`);
    });

    worker.on('error', (err) => {
      console.warn('[ReminderJob] Worker error:', err.message);
    });

    console.log('✅ Fee reminder job scheduled (daily at 9AM)');
  } catch (err) {
    console.warn('⚠️  Fee reminder job could not start (Redis unavailable):', err.message);
  }
};
