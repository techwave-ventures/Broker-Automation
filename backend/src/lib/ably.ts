import Ably from 'ably';
import { env } from '../config/env.js';

let client: Ably.Rest | null = null;

function getAblyClient() {
  if (!env.ABLY_KEY) {
    return null;
  }

  if (!client) {
    client = new Ably.Rest(env.ABLY_KEY);
  }

  return client;
}

export async function publishToChannel(channelName: string, eventName: string, payload: unknown) {
  const ably = getAblyClient();
  if (!ably) {
    return { skipped: true as const };
  }

  await ably.channels.get(channelName).publish(eventName, payload);
  return { skipped: false as const };
}

export async function createAblyTokenRequest(clientId: string) {
  if (!env.ABLY_KEY) {
    throw new Error('ABLY_KEY is not configured');
  }

  const ably = new Ably.Rest(env.ABLY_KEY);
  try {
    return await ably.auth.createTokenRequest(
      {
        ttl: 3600000,
        clientId,
      },
      {
        key: env.ABLY_KEY,
      },
    );
  } finally {
    // Ably REST clients do not need explicit close, but keeping the
    // control flow symmetrical makes future transport swaps easier.
  }
}
