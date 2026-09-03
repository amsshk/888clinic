FROM oven/bun:latest

WORKDIR /app

# Copy everything
COPY . .

# Install and build
RUN bun install --frozen-lockfile && bun run build

EXPOSE 3000

# Health check

# Start the production server
CMD ["bun", "/app/.output/server/index.mjs"]
