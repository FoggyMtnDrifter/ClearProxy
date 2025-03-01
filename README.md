# ClearProxy

> ⚠️ **Development Status**: ClearProxy is currently in alpha stage and under active development. While you're welcome to try it out and provide feedback, we don't recommend using it in production environments yet. Features may change, and there might be breaking changes between versions.

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

### Using Docker (Recommended)

1. Create a new directory and download the docker-compose.yml:
```bash
mkdir clearproxy && cd clearproxy
curl -L https://raw.githubusercontent.com/foggymtndrifter/clearproxy/main/docker-compose.yml -o docker-compose.yml
```

2. Create required directories and configuration:
```bash
mkdir -p data/caddy/data data/caddy/config/caddy data/certificates

cat > data/caddy/config/caddy/caddy.json << 'EOF'
{
  "admin": {
    "listen": "0.0.0.0:2019",
    "enforce_origin": false,
    "origins": ["*"]
  },
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [":80"],
          "routes": []
        }
      }
    }
  }
}
EOF
```

3. Create or modify docker-compose.yml:
```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY:-foggymtndrifter/clearproxy}:latest
    container_name: clearproxy-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/clearproxy.db
      - CADDY_API_URL=http://caddy:2019
    volumes:
      - ./data:/data
    networks:
      - proxy-network
    depends_on:
      - caddy

  caddy:
    image: caddy:2-alpine
    container_name: clearproxy-caddy
    restart: unless-stopped
    command: caddy run --config /config/caddy/caddy.json
    environment:
      - CADDY_ADMIN_LISTEN=0.0.0.0:2019  # Required for admin API access
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
      - "2019:2019"  # Admin API port (can be changed, e.g., "3019:2019")
    volumes:
      - ./data/caddy/data:/data
      - ./data/caddy/config:/config
      - ./data/certificates:/certificates
    networks:
      - proxy-network

networks:
  proxy-network:
    name: proxy-network
    driver: bridge
```

4. Start the application:
```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`.

### Local Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## Documentation

### Configuration

The application uses SQLite for data storage and communicates with Caddy's admin API.

#### Environment Variables

- `CADDY_API_URL`: URL of Caddy's admin API (default: `http://localhost:2019`)
- `DATABASE_PATH`: Path to SQLite database file (default: `./clearproxy.db`)
- `LOG_LEVEL`: Logging level (default: `info`)

### Docker Architecture

The setup includes two containers:

1. **ClearProxy App** (`clearproxy-app`):
   - SvelteKit application
   - Business logic and UI
   - SQLite database management

2. **Caddy Server** (`clearproxy-caddy`):
   - Proxy operations
   - SSL/TLS certificate management
   - Admin API

### Updating

To update to the latest version:

```bash
# Using Docker Compose
docker compose pull
docker compose up -d
```

### Troubleshooting

If you encounter issues:

1. Check the logs:
```bash
docker compose logs app
docker compose logs caddy
```

2. Common issues:
   - Verify Caddy JSON configuration exists and is correct
   - Ensure required directories exist with proper permissions
   - Check Caddy admin API accessibility (port 2019)

For more detailed information about:
- Logging configuration and management
- Database migrations and management
- Development setup and guidelines
- Contributing to the project

Please refer to our [documentation](docs/) directory.

## Community

- [GitHub Issues](https://github.com/foggymtndrifter/clearproxy/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/foggymtndrifter/clearproxy/discussions) - General questions and discussions
- Community chat (coming soon)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
