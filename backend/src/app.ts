import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { webhooksRouter } from './routes/webhooks.js';
import { pool } from './lib/db.js';
import { clearExpiredSessionCookie } from './middleware/auth.js';

let activeRequests = 0;

// Periodic server diagnostics logger
setInterval(() => {
  const memory = process.memoryUsage();
  console.log(`📊 [SERVER DIAGNOSTICS] ` +
    `Active HTTP Requests: ${activeRequests} | ` +
    `DB Pool (Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}) | ` +
    `Memory (RSS: ${(memory.rss / 1024 / 1024).toFixed(1)}MB, Heap: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB)`
  );
}, 5000).unref();

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(clearExpiredSessionCookie);

  // Performance tracking middleware
  app.use((req, res, next) => {
    activeRequests++;
    const start = Date.now();
    
    res.on('finish', () => {
      activeRequests--;
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`⚠️ [SLOW REQUEST] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
      }
    });

    res.on('close', () => {
      // Handle client disconnect before response finished
      if (res.writableFinished === false) {
        activeRequests--;
      }
    });

    next();
  });

  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', apiRouter);

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'business-messaging-backend' });
  });

  return app;
}
