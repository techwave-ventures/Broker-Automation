# Backend

Standalone Express backend for the business messaging app.

## What it covers

- JWT token validation for API requests
- PostgreSQL access through a capped connection pool (max: 10)
- Background task queueing and prioritization (Redis + BullMQ)
- Meta WhatsApp Cloud API helpers with rate-limiting and exponential backoff
- Meta webhook verification and asynchronous processing
- Ably publishing for webhook and duplex-style realtime updates
- Database-backed message and messaging event persistence

## Structure

- `src/controllers` contains request handling and business flow orchestration
- `src/modules` contains request schemas and data model types
- `src/routes` stays thin and only wires paths to controllers
- `src/services` contains shared Meta/Postgres business helpers
- `src/lib` contains core database pooling, caching, rate limiting, and BullMQ queue definitions
- `src/worker.ts` is the entry point for the background job processing worker

## Environment

Copy `backend/.env.example` to `backend/.env` or wire the same values from the root app. Ensure the following new variables are configured:
- `REDIS_URL`: The Redis connection string (e.g. `redis://localhost:6379`).

## Scripts

- `npm run dev`: Runs the API web server in development watch mode.
- `npm run worker`: Runs the background queue worker in development watch mode.
- `npm run build`: Compiles the TypeScript backend.
- `npm run start`: Starts the compiled API web server.
- `npm run worker:start`: Starts the compiled background queue worker.
- `npm run type-check`: Validates TypeScript typing without compiling.
