import { createApp } from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './lib/dbInit.js';
import { initCashfreePlan } from './lib/cashfreeInit.js';

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully.');

    await initCashfreePlan();
    console.log('Cashfree initialization/plan seeding completed.');
    
    const app = createApp();

    app.listen(env.PORT, () => {
      console.log(`Backend listening on port ${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  }
}

startServer();
