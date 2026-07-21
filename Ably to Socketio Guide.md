# Blueprint: Replacing Ably with Self-Hosted WebSockets (Socket.io)

This document outlines the blueprint to completely remove the Ably third-party service dependency and replace it with a self-hosted, real-time WebSocket connection using `socket.io` in our Express backend and Next.js frontend.

---

## Part 1: Express Backend Refactor

### 1. Install Dependencies
In the `/backend` directory, run:
```bash
npm install socket.io
npm install --save-dev @types/socket.io
```

### 2. Update Web Server Initialization (`/backend/src/server.ts`)
Instead of starting Express directly with `app.listen()`, create an HTTP server, attach a Socket.io server instance, and share it globally:

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: env.APP_BASE_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Handshake and join a room matching user_id to scope notifications
  socket.on('join_user_room', (userId: string) => {
    socket.join(userId);
    console.log(`👤 Client ${socket.id} joined room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Start httpServer instead of app
httpServer.listen(env.PORT || 3001, () => {
  console.log(`🚀 Server listening on port ${env.PORT || 3001}`);
});
```

### 3. Replace Ably Library (`/backend/src/lib/ably.ts` ➔ `/backend/src/lib/websocket.ts`)
Replace Ably publishing with local socket broadcasting:

```typescript
import { io } from '../server.js';

export async function publishToChannel(channelName: string, eventName: string, payload: any) {
  // If target is segmented by user_id/room, broadcast to that room:
  // e.g., if payload contains user_id:
  if (payload.userId) {
    io.to(payload.userId).emit(eventName, payload);
  } else {
    // Fallback: broadcast to everyone connected
    io.emit(eventName, payload);
  }
  return { skipped: false };
}
```

---

## Part 2: Next.js Frontend Refactor

### 1. Install Client SDK
In the `/frontend` directory, run:
```bash
npm install socket.io-client
```

### 2. Create Socket Client Instance (`/frontend/lib/socket.ts`)
```typescript
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  withCredentials: true,
});
```

### 3. Replace Polling in Conversations Page (`/frontend/app/dashboard/conversations/page.tsx`)
Instead of using `setInterval` to poll `/api/chats` every 5 seconds, connect to the Socket.io server and listen for incoming messages to trigger state updates instantly:

```typescript
import { useEffect } from 'react';
import { socket } from '@/lib/socket';

// Inside ConversationsPage component:
useEffect(() => {
  // Connect to websocket server
  socket.connect();

  if (user?.user_id) {
    socket.emit('join_user_room', user.user_id);
  }

  // Listen for real-time messages
  socket.on('webhook', (data) => {
    // Process new message structure instantly and append to state
    setChats(prevChats => {
      // Logic to insert/update the active conversation state
    });
  });

  return () => {
    socket.off('webhook');
    socket.disconnect();
  };
}, [user]);
```

---

## Benefits of this Solution
- **Cost Saving**: Entirely free and removes dependency on Ably limits.
- **Privacy/Control**: All WebSockets stay within your own VPC or hosting provider.
- **Instant Response**: Sub-second latency for message previews and WebRTC VoIP call events.
