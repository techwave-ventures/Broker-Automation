<!--
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
-->

# PropBot AI: WhatsApp Business Automation for Real Estate

A reference monorepo application demonstrating how tech providers can integrate with Meta's **WhatsApp Business Platform** to build an AI-powered real estate assistant.

PropBot AI automates the lead lifecycle for real estate agents and agencies: it onboards businesses via Meta's **Embedded Signup** (Facebook Login for Business), manages WhatsApp Business Accounts (WABAs), captures customer inquiries, matches them to property listings in a database, qualifies leads, schedules site visits, and provides a unified agent dashboard for manual human takeover.

---

## Architecture Overview

PropBot AI is structured as a two-tier monorepo for scalability, security, and responsive background processing:

```mermaid
graph TD
    User([Customer on WhatsApp]) -->|Webhook| Meta[Meta Graph API]
    Meta -->|POST Webhook| Backend[Express Backend API]
    Backend -->|Enqueue Job| Redis[(Redis + BullMQ)]
    Redis -->|Process Job| Worker[Background Worker]
    Worker -->|Read/Write| DB[(PostgreSQL DB)]
    Worker -->|Publish Event| Ably[Ably WebSockets]
    Ably -->|Real-Time Update| Frontend[Next.js 16 Frontend]
    Frontend -->|HTTP Requests| Backend
```

- **Frontend (`/frontend`)**: A Next.js 16 client application where agents manage property listings, review conversations, modify AI configurations, and monitor leads.
- **Backend (`/backend`)**: A standalone Node.js/Express API service that handles webhook verification, Auth0/cookie token validation, and WhatsApp operations.
- **Worker (`/backend/src/worker.ts`)**: A background process powered by **Redis and BullMQ** to guarantee asynchronous processing of incoming Meta webhook messages, preventing request timeouts and ensuring robust error handling/retry mechanisms.
- **Real-Time Streaming**: Uses **Ably WebSockets** to publish webhook payloads to the Next.js client, giving agents a responsive live messaging chat dashboard.

---

## Directory Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Environment config & JWT setup
│   │   ├── controllers/    # API routes & webhook controllers
│   │   ├── lib/            # PostgreSQL connection pool & Redis client
│   │   ├── middleware/     # Auth and validation middleware
│   │   ├── models/         # Database models (users, properties, leads)
│   │   ├── routes/         # Express router endpoints
│   │   ├── services/       # Meta Graph API and AI matching business logic
│   │   ├── server.ts       # Express API server entrypoint
│   │   └── worker.ts       # BullMQ worker for background processing
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/                # Next.js 16 App Router pages
│   ├── components/         # Reusable React components & UI blocks
│   ├── lib/                # API clients & types
│   ├── scripts/            # Local HTTPS dev server scripts (for Facebook SDK)
│   ├── package.json
│   └── tsconfig.json
│
├── DATABASE_SCHEMA.sql             # Meta asset tracking tables
└── DATABASE_SCHEMA_EXTENSIONS.sql  # User accounts, listings, and leads
```

---

## Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Local Dev Server**: Experimental HTTPS proxy for Meta JS SDK testing

### Backend
- **Framework**: [Express 5](https://expressjs.com/)
- **Task Queue**: [BullMQ](https://docs.bullmq.io/) + [Redis](https://redis.io/)
- **Database Access**: [PostgreSQL (pg client)](https://node-postgres.com/)
- **Real-time WebSockets**: [Ably](https://ably.com/)
- **Authentication**: Custom JWT using [jose](https://github.com/panva/jose) (Auth0 token compatibility)

---

## Database Setup

Before running the application, configure your PostgreSQL database (e.g., Neon or local postgres) by running both SQL scripts located at the root of the project:

1. **`DATABASE_SCHEMA.sql`**: Configures the base tables required to track Meta WABAs, phone numbers, Facebook pages, catalogs, and shared assets.
2. **`DATABASE_SCHEMA_EXTENSIONS.sql`**: Installs tables for user accounts (`users`), property listings (`properties`), leads and site visit appointments (`leads`), ongoing conversation sessions (`chats`), and AI assistant options (`bot_configs`).

---

## Configuration & Environment Variables

### Backend Configuration (`/backend/.env`)

Copy `backend/.env.example` to `backend/.env` and update the values:

```env
PORT=3001
NODE_ENV=development

# Postgres & Redis
POSTGRES_URL=postgres://user:password@localhost:5432/database
REDIS_URL=redis://localhost:6379

# Frontend URL
APP_BASE_URL=http://localhost:3000

# Auth & Tech Provider contact
AUTH0_DOMAIN=your-tenant.us.auth0.com
BYPASS_AUTH=false  # Set to true for local testing without JWT verification
TP_CONTACT_EMAIL=dev@example.com

# Meta App Settings
FB_APP_ID=your-facebook-app-id
FB_APP_SECRET=your-facebook-app-secret
FB_GRAPH_API_VERSION=v22.0
FB_REG_PIN=123456  # 6-digit registration pin
FB_VERIFY_TOKEN=your-webhook-verify-token

# Ably Websocket Key
ABLY_KEY=your-ably-api-key
```

### Frontend Configuration (`/frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local`:

```env
# Backend API URL
BACKEND_URL=http://localhost:3001

# Meta / Facebook Credentials (Required for WhatsApp Embedded Signup SDK)
NEXT_PUBLIC_FB_APP_ID=your-facebook-app-id
NEXT_PUBLIC_FB_CONFIG_ID=your-embedded-signup-config-id
```

---

## Getting Started (Local Development)

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js 18.18+**
- **PostgreSQL** instance with tables initialized
- **Redis** server running locally
- Accounts with **Ably** (realtime client) and **Meta Developer** (with a verified Business Account)

### 2. Start the Backend API & Worker
Open a terminal window:

```bash
cd backend

# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Start the API server & background task worker concurrently
npm start
```

Alternatively, you can run them in split terminals with live-reloads:
- Start web server: `npm run dev`
- Start background worker: `npm run worker`

### 3. Start the Frontend Next.js Client
Open a second terminal window:

```bash
cd frontend

# Install dependencies
npm install
```

To run the Facebook Embedded Signup flow locally, you **must use an HTTPS-enabled localhost domain**. Start the Next.js app with our built-in HTTPS proxy script:

```bash
# Start Next.js with local HTTPS (runs on https://localhost:3000)
npm run dev:https
```

*(For standard local testing without using the Embedded Signup modal, you can run `npm run dev` to serve over `http://localhost:3000`.)*

---

## Key Features

1. **Embedded Signup Integration**
   - Enables real estate businesses to log in with Facebook, grant permissions, and instantly register their WhatsApp phone numbers with your platform.
2. **AI Lead Qualification & Scoring**
   - The background worker reads incoming customer text messages, matches search requirements (e.g. "3 BHK in Baner under ₹1 Crore") to properties, calculates a Lead Score (High/Medium/Low), and registers site visit appointments.
3. **Agent Takeover Console**
   - View all chats in a real-time list. If an agent wants to message the client directly, they can toggle the chat status to `human_takeover` to disable AI replies.
4. **WhatsApp Webhook Queueing**
   - Webhook events are directly queued into Redis using BullMQ to handle load spikes efficiently and guarantee message delivery even when downstream resources are temporarily slow.

---

## Going to Production

To move this system to production:
1. **Complete Meta Business Verification**: Your tech provider business must be verified to make signup public.
2. **Configure App Review**: Request `whatsapp_business_management` and `whatsapp_business_messaging` permissions.
3. **Provide Valid HTTPS Webhook URLs**: Configure Meta Webhook Settings to point to your live Express backend at `https://your-backend-domain/api/webhooks`.
4. **Deploy Frontend & Backend**: Host the Next.js App on Vercel or equivalent, and deploy the Express API + worker on an infrastructure support system (e.g., Render, ECS, or Docker containers).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
