import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './lib/dbInit.js';
import { initCashfreePlan } from './lib/cashfreeInit.js';

export let io: Server;

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully.');

    await initCashfreePlan();
    console.log('Cashfree initialization/plan seeding completed.');
    
    const app = createApp();
    const httpServer = createServer(app);

    io = new Server(httpServer, {
      cors: {
        origin: [env.FRONTEND_BASE_URL, 'http://localhost:3000', 'https://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      socket.on('join_user_room', (userId: string) => {
        socket.join(userId);
        console.log(`👤 Client ${socket.id} joined room: ${userId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(env.PORT, () => {
      console.log(`Backend listening on port ${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  }
}

startServer();
