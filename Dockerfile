FROM oven/bun:latest

WORKDIR /app

# Copy everything
COPY . .

# Install and build
RUN bun install --frozen-lockfile && bun run build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the production server
CMD ["bun", "/app/.output/server/index.mjs"]
