import { Queue, Worker, QueueEvents } from 'bullmq';
import { getBullMQConnection } from '../config/redis.js';
import { getSession } from '../config/db.js';
import {
  getOverdueDemandsWithPenalties,
  applyLateFeeToDemand,
} from '../services/lateFee.service.js';
import { postLateFeeEntry } from '../services/ledger.service.js';

const QUEUE_NAME = 'late-fee-processor';

let queue = null;
let worker = null;

/**
 * processLateFees — Core job handler executed every midnight.
 * For each overdue demand: posts DR/CR ledger pair and updates demand.
 */
const processLateFees = async () => {
  const results = await getOverdueDemandsWithPenalties();
  console.log(`[LateFeeJob] Processing ${results.length} overdue demands...`);

  let processed = 0;
  let failed = 0;

  for (const { demand, penalty } of results) {
    const session = await getSession();
    try {
      await session.withTransaction(async () => {
        await postLateFeeEntry({
          studentId: demand.student,
          demandId: demand._id,
          lateFeeAmount: penalty,
          session,
        });
        await applyLateFeeToDemand(demand._id, penalty, session);
      });
      processed++;
    } catch (err) {
      failed++;
      console.error(`[LateFeeJob] Failed for demand ${demand._id}:`, err.message);
    } finally {
      await session.endSession();
    }
  }

  console.log(`[LateFeeJob] Done. Processed: ${processed}, Failed: ${failed}`);
  return { processed, failed };
};

export const initLateFeeJob = () => {
  try {
    const connection = getBullMQConnection();

    queue = new Queue(QUEUE_NAME, { connection });

    // Remove existing repeatable jobs before adding
    queue.getRepeatableJobs().then((jobs) => {
      jobs.forEach((job) => queue.removeRepeatableByKey(job.key));
    }).catch(() => {});

    // Schedule: daily at midnight (00:00)
    queue.add(
      'apply-late-fees',
      {},
      {
        repeat: { cron: '0 0 * * *' },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    );

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        console.log(`[LateFeeJob] Triggered at ${new Date().toISOString()}`);
        return processLateFees();
      },
      { connection }
    );

    worker.on('completed', (job, result) => {
      console.log(`[LateFeeJob] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, err) => {
      console.error(`[LateFeeJob] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.warn('[LateFeeJob] Worker error (Redis may be unavailable):', err.message);
    });

    console.log('✅ Late fee BullMQ job scheduled (daily at midnight)');
  } catch (err) {
    console.warn('⚠️  Late fee job could not start (Redis unavailable):', err.message);
    console.warn('   Background jobs disabled. Start Redis to enable late-fee automation.');
  }
};

/**
 * triggerLateFeeJobNow — For admin manual trigger / testing.
 */
export const triggerLateFeeJobNow = async () => {
  if (!queue) throw new Error('Late fee queue not initialized');
  return queue.add('apply-late-fees-manual', {}, { removeOnComplete: 10 });
};

export { queue as lateFeeQueue };
