# ClearProxy

A modern, web-based management interface for [Caddy](https://caddyserver.com/), focusing on reverse proxy configuration with automatic HTTPS.

## Features

- 🌐 Easy management of proxy hosts
- 🔒 Automatic HTTPS via Caddy's built-in ACME client
- 🔐 Basic authentication support for proxied hosts
- ⚡ Modern, responsive UI built with SvelteKit
- 🛠️ Advanced configuration support with raw Caddyfile syntax
- 📊 Access logging and monitoring
- 🔄 Automatic database migrations

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Configuration

The application uses SQLite for data storage and communicates with Caddy's admin API for configuration management.

### Environment Variables

- `CADDY_ADMIN_API`: URL of Caddy's admin API (default: `http://localhost:2019`)
- `DATABASE_PATH`: Path to SQLite database file (default: `./clearproxy.db`)

### Database Migrations

The application automatically handles database migrations on startup:
- No manual intervention required
- Migrations run automatically when you update the application
- Check application logs for any migration issues
- Backup your database before updating in production

## Logging

ClearProxy uses structured logging powered by [Pino](https://getpino.io/) to provide comprehensive logging capabilities. The logging system is designed to help with troubleshooting and monitoring in production environments.

### Log Levels

The application uses the following log levels:
- `error`: For errors that need immediate attention
- `warn`: For potentially harmful situations
- `info`: For general operational information
- `debug`: For detailed debugging information

### Log Files

Logs are stored in the `logs` directory:
- `logs/app.log`: Contains all application logs
- `logs/error.log`: Contains only error-level logs

### Log Components

The logging system is organized by components:
- `apiLogger`: API endpoint operations
- `authLogger`: Authentication and session management
- `dbLogger`: Database operations
- `caddyLogger`: Caddy server configuration and management

### Environment Variables

You can configure the logging level using the `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug # For development
LOG_LEVEL=info  # For production (default)
```

### Log Format

Logs are output in JSON format for easy parsing and include:
- Timestamp
- Log level
- Component name
- Message
- Additional context (e.g., user ID, request details)

Example log entry:
```json
{
  "level": "INFO",
  "time": "2024-03-01T12:00:00.000Z",
  "component": "auth",
  "msg": "User logged in successfully",
  "userId": 123,
  "email": "user@example.com"
}
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about:
- Setting up your development environment
- Database management with Drizzle ORM
- Project structure
- Code style guidelines
- Submitting changes

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Powered by [Caddy](https://caddyserver.com/)
- Database management by [Drizzle ORM](https://orm.drizzle.team/)

## Docker Installation

You can run ClearProxy using Docker in two ways:

### Using Docker Compose (Recommended)

1. Create a new directory for your installation:
```bash
mkdir clearproxy && cd clearproxy
```

2. Download the docker-compose.yml file:
```bash
curl -L https://raw.githubusercontent.com/foggymtndrifter/clearproxy/main/docker-compose.yml -o docker-compose.yml
```

3. Create the required directories:
```bash
mkdir -p data/caddy/data data/caddy/config data/certificates
```

4. Start the container:
```bash
docker compose up -d
```

The application will be available at `http://localhost` (or your server's IP address).

### Using Docker CLI

```bash
docker run -d \
  --name clearproxy \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -p 2019:2019 \
  -v ./data/caddy/data:/data \
  -v ./data/caddy/config:/config \
  -v ./data/certificates:/certificates \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/data/caddy-manager.db \
  ghcr.io/foggymtndrifter/clearproxy:latest
```

### Updating the Container

To update to the latest version:

```bash
# Using Docker Compose
docker compose pull
docker compose up -d

# Using Docker CLI
docker pull ghcr.io/foggymtndrifter/clearproxy:latest
docker stop clearproxy
docker rm clearproxy
# Then run the container again using the command above
```
