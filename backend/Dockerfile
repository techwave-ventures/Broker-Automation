# Base Node image
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run build step to compile TypeScript
RUN npm run build

# Production image runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Set proper ownership for the /app directory
RUN chown node:node /app

# Install only production dependencies
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --only=production

# Copy compiled build output
COPY --chown=node:node --from=builder /app/dist ./dist

# Use the non-root node user
USER node

EXPOSE 3001

ENV PORT=3001

# Default command to run the API server
CMD ["node", "dist/server.js"]
