# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the built application and migrations
COPY --from=builder /app/build ./build
COPY --from=builder /app/src/lib/db/migrations ./migrations
COPY --from=builder /app/package.json ./package.json

# Create required directories and set permissions
RUN mkdir -p /data /app/build/server/logs && \
    chown -R node:node /data /app/build/server/logs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost
ENV DATABASE_PATH=/data
ENV MIGRATIONS_PATH=/app/migrations

# Switch to non-root user
USER node

# Start the application
CMD ["node", "build/index.js"] 