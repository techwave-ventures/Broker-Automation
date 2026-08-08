import { Worker, Job } from 'bullmq';
import { initDatabase } from './lib/dbInit.js';
import { redisConnection } from './lib/redis.js';
import {
  handleWhatsappSend,
  handleWhatsappTemplateSend,
  handleTokenExchangeFollowup,
  handleWebhookProcess,
  handleUpdateRollingSummary,
  handleGeminiReply,
} from './lib/queue.js';

async function startWorker() {
  console.log('Starting BullMQ Queue Worker...');

  try {
    await initDatabase();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database in worker:', err);
    process.exit(1);
  }

  const worker = new Worker(
    'whatsapp-queue',
    async (job: Job) => {
      console.log(`Processing job ${job.id} (type: ${job.name})...`);
      
      switch (job.name) {
        case 'whatsapp_send':
          return await handleWhatsappSend(job.data);
        case 'whatsapp_template_send':
          return await handleWhatsappTemplateSend(job.data);
        case 'token_exchange_followup':
          return await handleTokenExchangeFollowup(job.data);
        case 'webhook_process':
          return await handleWebhookProcess(job.data);
        case 'update_rolling_summary':
          return await handleUpdateRollingSummary(job.data);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently
      stalledInterval: 300000, // Check for stalled jobs every 5 minutes
      drainDelay: 60, // Wait 60s before checking again when queue is empty
      settings: {
        backoffStrategies: {
          custom(attemptsMade: number, err: any) {
            // Handle concurrency lock busy retries quickly (in 2 seconds)
            if (err.message?.includes('Lock busy')) {
              console.log(`⚠️ [BULLMQ BACKOFF] Lock busy. Retrying job in 2000ms...`);
              return 2000;
            }
            // If it is a rate limit error (status 429), respect retryAfterMs or backoff
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Rate Limit')) {
              const delay = err.retryAfterMs || Math.min(2 ** attemptsMade * 10000, 120000);
              console.warn(`⚠️ [BULLMQ BACKOFF] Job rate limited (Attempt ${attemptsMade}). Retrying in ${delay}ms. Error: ${err.message}`);
              return delay;
            }
            // Standard backoff for other errors
            return Math.min(2 ** attemptsMade * 5000, 60000);
          }
        }
      } as any
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} (type: ${job.name}) completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Job ${job?.id} (type: ${job?.name}) failed:`, err.message);
  });

  const geminiWorker = new Worker(
    'gemini-queue',
    async (job: Job) => {
      console.log(`Processing Gemini job ${job.id} (type: ${job.name})...`);
      if (job.name === 'gemini_reply') {
        return await handleGeminiReply(job.data);
      } else {
        throw new Error(`Unknown Gemini job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Only 1 concurrent Gemini call to avoid parallel race condition/conflicts
      limiter: {
        max: 1000,
        duration: 60000, // 1000 requests per 60 seconds (1000 RPM limit)
      },
      settings: {
        backoffStrategies: {
          custom(attemptsMade: number, err: any) {
            if (err.message?.includes('Lock busy')) {
              console.log(`⚠️ [BULLMQ GEMINI BACKOFF] Lock busy. Retrying Gemini job in 2000ms...`);
              return 2000;
            }
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Rate Limit')) {
              const delay = err.retryAfterMs || Math.min(2 ** attemptsMade * 10000, 120000);
              console.warn(`⚠️ [BULLMQ GEMINI BACKOFF] Rate limited (Attempt ${attemptsMade}). Retrying in ${delay}ms. Error: ${err.message}`);
              return delay;
            }
            return Math.min(2 ** attemptsMade * 5000, 60000);
          }
        }
      } as any
    }
  );

  geminiWorker.on('completed', (job: Job) => {
    console.log(`Gemini job ${job.id} completed successfully.`);
  });

  geminiWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Gemini job ${job?.id} failed:`, err.message);
  });

  console.log('BullMQ Queue Workers are active and waiting for jobs.');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down workers gracefully...');
    await worker.close();
    await geminiWorker.close();
    console.log('Workers shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startWorker().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
