import { getIo, getPubClient } from './socketio.js';

export async function publishToChannel(channelName: string, eventName: string, payload: any) {
  const io = getIo();
  
  if (io) {
    // We are in the server process, emit directly
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
  } else {
    // We are in the worker process, publish to Redis Pub/Sub
    try {
      const pub = getPubClient();
      await pub.publish('socketio:broadcast', JSON.stringify({ channelName, eventName, payload }));
    } catch (err) {
      console.error('❌ Failed to publish to Redis Pub/Sub:', err);
      return { skipped: true };
    }
  }

  return { skipped: false };
}
