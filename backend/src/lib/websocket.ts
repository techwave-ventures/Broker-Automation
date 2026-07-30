import { io } from '../server.js';

export async function publishToChannel(channelName: string, eventName: string, payload: any) {
  if (!io) {
    console.warn('⚠️ Socket.io is not initialized yet.');
    return { skipped: true };
  }

  // If channel is structured as "prefix:userId", e.g. "leads:user@email.com"
  if (channelName.includes(':')) {
    const parts = channelName.split(':');
    const room = parts[1];
    io.to(room).emit(eventName, payload);
  } else {
    // Emit to room named after the channel (e.g. 'get-started')
    io.to(channelName).emit(eventName, payload);
    // Also broadcast globally as fallback
    io.emit(eventName, payload);
  }

  return { skipped: false };
}
