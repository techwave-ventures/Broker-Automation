import { pool } from '../lib/db.js';

async function runMigration() {
  console.log('🚀 Starting DB migration (Drop unique constraint)...');
  try {
    // 1. Drop the unique constraint on customer_phone
    console.log('Dropping unique constraint on customer_phone to allow multi-interest leads...');
    await pool.query(`
      ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_phone_unique;
    `);

    // 2. Also drop any unique indexes on user_id + customer_phone if they exist
    await pool.query(`
      DROP INDEX IF EXISTS idx_leads_user_phone_unique;
    `);

    console.log('✅ DB Migration completed successfully!');
  } catch (err) {
    console.error('❌ DB Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
