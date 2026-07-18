-- WhatsApp Business Sample Tech Provider App - Database Schema
-- Run this SQL in your Neon PostgreSQL database

CREATE TABLE IF NOT EXISTS wabas (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  waba_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_waba_key ON wabas (user_id, app_id, waba_id);

CREATE TABLE IF NOT EXISTS phones (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_id BIGINT NOT NULL,
  user_id VARCHAR,
  is_ack_bot_enabled BOOLEAN DEFAULT FALSE,
  ack_bot_message TEXT DEFAULT '',
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS phone_key ON phones (phone_id);

CREATE TABLE IF NOT EXISTS pages (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_page_key ON pages (user_id, app_id, page_id);

CREATE TABLE IF NOT EXISTS ad_accounts (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_account_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_ad_account_key ON ad_accounts (user_id, app_id, ad_account_id);

CREATE TABLE IF NOT EXISTS businesses (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_business_key ON businesses (user_id, app_id, business_id);

CREATE TABLE IF NOT EXISTS catalogs (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalog_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_catalog_key ON catalogs (user_id, app_id, catalog_id);

CREATE TABLE IF NOT EXISTS datasets (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dataset_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_dataset_key ON datasets (user_id, app_id, dataset_id);

CREATE TABLE IF NOT EXISTS instagram_accounts (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instagram_account_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_instagram_account_key ON instagram_accounts (user_id, app_id, instagram_account_id);
