import { io } from 'socket.io-client';

export const socket = io({
  autoConnect: false,
  withCredentials: true,
});

let configPromise: Promise<string> | null = null;

async function fetchBackendUrl(): Promise<string> {
  if (configPromise) return configPromise;

  configPromise = fetch('/api/socket-config')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch socket config');
      return res.json();
    })
    .then((data) => data.backendUrl || '')
    .catch((err) => {
      console.error('Socket config error:', err);
      configPromise = null;
      return '';
    });

  return configPromise;
}

export async function connectSocket(userId?: string | null) {
  const backendUrl = await fetchBackendUrl();
  
  // Update Socket.io URI dynamically
  (socket.io as any).uri = backendUrl;
  
  if (!socket.connected) {
    socket.connect();
  }

  if (userId) {
    socket.emit('join_user_room', userId);
  }
}
