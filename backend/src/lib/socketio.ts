import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let ioInstance: Server | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

function createRedisClient() {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
  });
}

export function setIo(io: Server) {
  ioInstance = io;

  // Initialize Redis subscription in the server process
  subClient = createRedisClient();
  subClient.subscribe('socketio:broadcast', (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to Redis Pub/Sub:', err);
    } else {
      console.log('📡 Subscribed to Redis Pub/Sub channel "socketio:broadcast"');
    }
  });

  subClient.on('message', (channel, message) => {
    if (channel === 'socketio:broadcast') {
      try {
        const { channelName, eventName, payload } = JSON.parse(message);
        if (ioInstance) {
          if (channelName.includes(':')) {
            const parts = channelName.split(':');
            const room = parts[1];
            ioInstance.to(room).emit(eventName, payload);
          } else {
            ioInstance.to(channelName).emit(eventName, payload);
            ioInstance.emit(eventName, payload);
          }
        }
      } catch (err) {
        console.error('❌ Failed to parse Redis Pub/Sub message:', err);
      }
    }
  });
}

export function getIo(): Server | null {
  return ioInstance;
}

export function getPubClient(): Redis {
  if (!pubClient) {
    pubClient = createRedisClient();
  }
  return pubClient;
}
