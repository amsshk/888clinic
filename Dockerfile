# Multi-stage build: dependencies and build
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml* tsconfig.json* vite.config.ts* ./
COPY .prettierignore* .prettierrc* eslint.config.js* ./

# Install dependencies with Bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
RUN bun run build

# Runtime stage: Node.js runtime
FROM oven/bun:latest

WORKDIR /app

# Copy built output and public files from builder
COPY --from=builder /app/.output ./
COPY --from=builder /app/.output/public ./public

# Install Bun globally (already in image)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run 'fetch("http://localhost:3000").catch(() => process.exit(1))' || exit 1

# Start the production server (Nitro SSR)
CMD ["node", "server/index.mjs"]
