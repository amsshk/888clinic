FROM oven/bun:latest
WORKDIR /app
# Copy everything
COPY . .
# Set build args for Vite substitution
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
# Install and build
RUN bun install --frozen-lockfile && bun run build
EXPOSE 3000
ENV NITRO_PORT=3000
# Start the production server
CMD ["bun", "/app/.output/server/index.mjs"]
