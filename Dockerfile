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
FROM caddy:2-alpine

# Copy the built application
COPY --from=builder /app/build /srv
COPY --from=builder /app/Caddyfile /etc/caddy/Caddyfile

# Expose ports
EXPOSE 80
EXPOSE 443
EXPOSE 2019

# Set environment variables
ENV NODE_ENV=production

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"] 