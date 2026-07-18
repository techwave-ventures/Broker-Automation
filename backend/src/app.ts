import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', apiRouter);

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'business-messaging-backend' });
  });

  return app;
}
