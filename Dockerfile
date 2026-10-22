# Stage 1: Base image with verified Bun version
FROM oven/bun:1.4.3-alpine AS base
WORKDIR /app

# Stage 2: Install production dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3: Minimal production runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production node_modules and manifest
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock ./

# Copy application code
COPY src/ ./src
COPY server.js login.js sessionManager.js ./

# Ensure storage directory exists and assign permissions to non-root user
RUN mkdir -p /app/data && chown -R bun:bun /app

# Run as non-root user
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["bun", "run", "src/healthcheck.js"]

CMD ["bun", "run", "src/server.js"]
