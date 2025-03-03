# Advanced Configuration

This guide covers advanced configuration options in ClearProxy for power users who want to leverage the full capabilities of Caddy.

## Custom JSON Configuration Snippets

ClearProxy provides a user-friendly interface for common proxy configurations, but you can also use raw Caddy JSON configuration for advanced use cases.

### Adding Custom Snippets to a Proxy Host

1. Navigate to **Proxy Hosts**
2. Edit the proxy host you want to customize
3. Go to the **Advanced** tab
4. Scroll down to the **Additional Caddyfile Configuration** section
5. Enter your custom Caddy configuration in JSON format
6. Click **Save**

### Example Snippets

#### Enhanced Security Headers

```json
{
  "match": [
    {
      "path": ["/*"]
    }
  ],
  "handle": [
    {
      "handler": "headers",
      "response": {
        "set": {
          "Strict-Transport-Security": ["max-age=31536000; includeSubDomains; preload"],
          "X-Content-Type-Options": ["nosniff"],
          "X-Frame-Options": ["DENY"],
          "Referrer-Policy": ["strict-origin-when-cross-origin"],
          "X-XSS-Protection": ["1; mode=block"],
          "Content-Security-Policy": ["default-src 'self'"]
        }
      }
    }
  ]
}
```

#### Rate Limiting

```json
{
  "match": [
    {
      "path": ["/api/*"]
    }
  ],
  "handle": [
    {
      "handler": "rate_limit",
      "zone": "static_zone",
      "rate": "100r/m",
      "burst": 50
    }
  ]
}
```

#### Custom Error Pages

```json
{
  "handle": [
    {
      "handler": "error",
      "error": "not_found",
      "status_code": 404,
      "body": "Custom 404 page content"
    }
  ]
}
```

#### Rewriting Paths

```json
{
  "handle": [
    {
      "handler": "rewrite",
      "uri": "/new-path",
      "match": {
        "path": ["/old-path"]
      }
    }
  ]
}
```

## Environment Variables

ClearProxy supports the following environment variables for advanced configuration:

| Variable             | Description                              | Default                 |
| -------------------- | ---------------------------------------- | ----------------------- |
| `CADDY_API_URL`      | URL of Caddy's admin API                 | `http://localhost:2019` |
| `DATABASE_PATH`      | Path to database files                   | `.`                     |
| `LOG_LEVEL`          | Logging level (debug, info, warn, error) | `info`                  |
| `CADDY_ADMIN_LISTEN` | Host and port for Caddy admin API        | `0.0.0.0:2019`          |

### Setting Environment Variables

#### In Docker (docker-compose.yml)

```yaml
services:
  app:
    # ...
    environment:
      - CADDY_API_URL=http://caddy:2019
      - DATABASE_PATH=/data
      - LOG_LEVEL=debug

  caddy:
    # ...
    environment:
      - CADDY_ADMIN_LISTEN=0.0.0.0:2019
```

#### Manual Installation (.env file)

```
CADDY_API_URL=http://localhost:2019
DATABASE_PATH=.
LOG_LEVEL=debug
CADDY_ADMIN_LISTEN=0.0.0.0:2019
```

## Direct Caddy API Integration

For advanced users, ClearProxy uses Caddy's Admin API to apply configurations. You can interact with this API directly for advanced use cases.

### Caddy API Endpoints

The Caddy Admin API is available at `http://localhost:2019` by default. Some useful endpoints:

- `/config/` - View or modify the entire Caddy configuration
- `/config/apps/http` - HTTP app configuration
- `/config/apps/http/servers/srv0/routes` - Server routes
- `/load` - Load a new configuration

### Example: Viewing Current Configuration

```bash
curl http://localhost:2019/config/ | jq
```

### Example: Adding a Custom Route

```bash
curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
  -H "Content-Type: application/json" \
  -d '{
    "handle": [
      {
        "handler": "static_response",
        "body": "Hello, World!"
      }
    ],
    "match": [
      {
        "path": ["/hello"]
      }
    ]
  }'
```

## Custom Docker Configuration

### Volumes and Persistence

ClearProxy with Docker uses volumes for persistence:

```yaml
volumes:
  - ./data:/data # App data and SQLite database
  - ./data/caddy/data:/data # Caddy data (certificates, etc.)
  - ./data/caddy/config:/config # Caddy configuration
  - ./data/certificates:/certificates # Optional separate certificates volume
```

### Custom Networks

For advanced networking, you can customize the Docker network:

```yaml
networks:
  proxy-network:
    name: proxy-network
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Using an External Caddy Server

If you want to use ClearProxy with an existing Caddy server:

1. Configure your Caddy server to expose the Admin API
2. Set the `CADDY_API_URL` environment variable to point to your Caddy server's Admin API
3. Ensure network connectivity between ClearProxy and your Caddy server

Example docker-compose.yml for using an external Caddy server:

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/foggymtndrifter/clearproxy:latest
    container_name: clearproxy-app
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/clearproxy.db
      - CADDY_API_URL=http://your-external-caddy:2019
    volumes:
      - ./data:/data
```

## Using ClearProxy with Reverse Proxies or Load Balancers

If you're using ClearProxy behind another reverse proxy or load balancer:

1. Configure your front-end proxy to forward the appropriate headers:

   ```
   X-Forwarded-For
   X-Forwarded-Proto
   X-Forwarded-Host
   X-Real-IP
   ```

2. If your front-end proxy terminates SSL, make sure Caddy is aware it's running behind a proxy by setting the appropriate headers in your proxy configuration

## Custom TLS Certificates

To use custom certificates instead of letting Caddy obtain them automatically:

1. Mount your certificates into the Caddy container
2. Use a custom JSON configuration to configure the TLS:
   ```json
   {
     "handle": [
       {
         "handler": "tls",
         "certificates": {
           "load_files": [
             {
               "certificate": "/path/to/cert.pem",
               "key": "/path/to/key.pem"
             }
           ]
         }
       }
     ]
   }
   ```

## Performance Tuning

For high-traffic environments, consider these performance optimizations:

1. Increase Caddy's file descriptor limits:

   ```yaml
   services:
     caddy:
       # ...
       ulimits:
         nofile:
           soft: 65536
           hard: 65536
   ```

2. Configure caching policies for static content:

   ```json
   {
     "match": [
       {
         "path": ["/static/*"]
       }
     ],
     "handle": [
       {
         "handler": "headers",
         "response": {
           "set": {
             "Cache-Control": ["public, max-age=31536000"]
           }
         }
       }
     ]
   }
   ```

3. Optimize Docker container resources:
   ```yaml
   services:
     caddy:
       # ...
       mem_limit: 1g
       cpus: 2
   ```
