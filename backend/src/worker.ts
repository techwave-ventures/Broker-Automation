import { Worker, Job } from 'bullmq';
import { initDatabase } from './lib/dbInit.js';
import {
  redisConnection,
  handleWhatsappSend,
  handleWhatsappTemplateSend,
  handleTokenExchangeFollowup,
  handleWebhookProcess,
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
    'whatsapp-jobs',
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
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently per worker instance
      stalledInterval: 300000, // Check for stalled jobs every 5 minutes (instead of 30s) to save Redis commands
      drainDelay: 10, // Wait 10s before checking again when queue is empty
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} (type: ${job.name}) completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Job ${job?.id} (type: ${job?.name}) failed:`, err.message);
  });

  console.log('BullMQ Queue Worker is active and waiting for jobs.');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker gracefully...');
    await worker.close();
    console.log('Worker shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startWorker().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
