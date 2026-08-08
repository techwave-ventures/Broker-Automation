import { enqueueJob } from '../lib/queue.js';
import { redisConnection } from '../lib/redis.js';

const phone = process.argv[2] || '919999999999';
const text = process.argv[3] || 'Hi, I want a residential 2BHK flat in Baner.';

async function run() {
  console.log(`📨 Sending mock message from ${phone}: "${text}"`);
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '16505550300',
                phone_number_id: '123456789'
              },
              contacts: [
                {
                  profile: {
                    name: 'Mock Customer'
                  },
                  wa_id: phone
                }
              ],
              messages: [
                {
                  from: phone,
                  id: `wamid.mock_${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: {
                    body: text
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  try {
    await enqueueJob('webhook_process', payload);
    console.log('✅ Mock webhook message successfully enqueued into Redis queue!');
  } catch (err) {
    console.error('❌ Failed to enqueue mock message:', err);
  } finally {
    // Graceful disconnect
    setTimeout(() => {
      redisConnection.quit();
      process.exit(0);
    }, 500);
  }
}

run();
