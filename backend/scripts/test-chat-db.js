import { generateAutoReply } from '../src/services/gemini.js';
import { pool } from '../src/lib/db.js';
import { findOrCreateConversation, saveMessage } from '../src/models/conversationModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
if (serviceAccountJson) {
  try {
    const tempKeyPath = path.join(process.cwd(), 'temp-gcp-key.json');
    fs.writeFileSync(tempKeyPath, serviceAccountJson.trim());
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
  } catch (err) {
    console.error('Failed to write service account JSON:', err);
  }
}

const instructions = `You are a helpful real estate assistant. Help buyers find the right property.
CRITICAL RULE: You must collect the buyer's basic information first (such as their name, budget, preferred location, and configuration like 2BHK/3BHK) BEFORE recommending any specific properties. Do not suggest or list any properties until you have gathered these requirements.
Keep your responses short, conversational, and crisp (maximum 5-10 words per response + If sharing property details then link should be shared). Be polite, professional, and respond in the same language the user writes in. Always try to schedule a site visit after gathering requirements and recommending suitable properties.`;

async function run() {
  try {
    // 1. Get or Create a test user
    let userRes = await pool.query('SELECT user_id, email FROM users LIMIT 1');
    let user = userRes.rows[0];

    if (!user) {
      console.log('No user found in DB. Creating a default "local-dev" user...');
      const insertUserRes = await pool.query(
        `INSERT INTO users (user_id, email, password_hash, name)
         VALUES ($1, $2, $3, $4) RETURNING user_id, email`,
        ['local-dev', 'dev@example.com', 'dummyhash', 'Local Dev User']
      );
      user = insertUserRes.rows[0];
    }
    console.log(`Using User: ${user.user_id} (${user.email})`);

    // 2. Insert a sample Koregaon Park property if it doesn't exist
    const propTitle = 'Premium 3 BHK Flat in Koregaon Park';
    const checkProp = await pool.query(
      "SELECT key FROM properties WHERE user_id = $1 AND title = $2",
      [user.email, propTitle]
    );

    if (checkProp.rows.length === 0) {
      console.log('Inserting sample Koregaon Park property for matching...');
      await pool.query(
        `INSERT INTO properties (
          user_id, title, description, transaction_type, expected_price,
          category, type, city, locality, full_address, beds, baths, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          user.email,
          propTitle,
          'Luxurious 3 BHK apartment with private balcony in premium Lane 5, Koregaon Park.',
          'Sell',
          18000000, // 1.8 Crore
          'Residential',
          'Flat',
          'Pune',
          'Koregaon Park',
          'Lane 5, Koregaon Park, Pune',
          3,
          3,
          'Available'
        ]
      );
    }

    // Fetch active listings for the propertiesContext
    const propertiesRes = await pool.query(
      `SELECT title, description, transaction_type, expected_price, monthly_rent, type, city, locality, full_address, beds, baths, status 
       FROM properties 
       WHERE user_id = $1 AND status = 'Available'`,
      [user.email]
    );

    const propertiesContext = propertiesRes.rows.map((p, index) => {
      const priceText = p.transaction_type === 'Sell' ? `Price: ₹${p.expected_price}` : `Rent: ₹${p.monthly_rent}/mo`;
      return `${index + 1}. ${p.title} (${p.type} for ${p.transaction_type})
  - Location: ${p.locality}, ${p.city} (${p.full_address})
  - ${priceText}
  - Details: ${p.beds ? p.beds + ' BHK, ' : ''}${p.baths ? p.baths + ' baths, ' : ''}${p.description || ''}
  - Link: https://xyz.com/property/${index + 1}`;
    }).join('\n\n');

    // 3. Create or Reset a test conversation
    const customerPhone = '918446270963';
    const conversation = await findOrCreateConversation(user.user_id, customerPhone, 'Akash', '919209143384');
    
    // Clear existing messages for a clean simulation
    console.log(`Clearing old messages in conversation ID: ${conversation.id}...`);
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversation.id]);

    // Helper function to simulate a step of dialogue
    async function runDialogueStep(userText) {
      console.log(`\n--- TURN ---`);
      console.log(`User: "${userText}"`);

      // A. Save user message to DB
      const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await saveMessage({
        conversationId: conversation.id,
        senderNumber: customerPhone,
        recipientNumber: '919209143384',
        senderType: 'customer',
        body: userText,
        direction: 'inbound',
        messageId: userMsgId
      });

      // B. Fetch conversation history from DB
      const historyRes = await pool.query(
        'SELECT body, sender_type FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversation.id]
      );
      const history = historyRes.rows.map(row => ({
        role: row.sender_type === 'customer' ? 'user' : 'model',
        text: row.body
      }));

      // C. Generate AI Reply
      const botReply = await generateAutoReply(instructions, history, propertiesContext);
      console.log(`Bot: "${botReply}"`);

      // D. Save bot message to DB
      const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await saveMessage({
        conversationId: conversation.id,
        senderNumber: '919209143384',
        recipientNumber: customerPhone,
        senderType: 'bot',
        body: botReply,
        direction: 'outbound',
        messageId: botMsgId
      });
    }

    // Simulate dialogue sequence requested by the user
    await runDialogueStep("hii");
    await runDialogueStep("akash jare");
    await runDialogueStep("3 bhk flat in koregaon park");
    await runDialogueStep("my budget is 2 crore");

    // Print final DB state
    console.log('\n======================================');
    console.log('FINAL DATABASE CONVERSATION RECORDS');
    console.log('======================================');
    const finalMsgs = await pool.query(
      'SELECT sender_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversation.id]
    );
    console.table(finalMsgs.rows);

  } catch (error) {
    console.error('Test simulation failed:', error);
  } finally {
    const tempKeyPath = path.join(process.cwd(), 'temp-gcp-key.json');
    if (fs.existsSync(tempKeyPath)) {
      fs.unlinkSync(tempKeyPath);
    }
    await pool.end();
  }
}

run();
