# Docker Configuration

This document covers the Docker configuration details for ClearProxy, including important settings and customization options.

## Container Architecture

ClearProxy uses a two-container setup:

1. **App Container** (`clearproxy-app`)
   - SvelteKit application
   - Manages proxy configurations
   - Communicates with Caddy's admin API

2. **Caddy Container** (`clearproxy-caddy`)
   - Handles proxy operations
   - Manages SSL/TLS certificates
   - Provides admin API

## Important Configuration

### Caddy Admin API

The Caddy admin API is crucial for ClearProxy's operation. By default, it listens on port 2019, but this can be customized.

#### Required Settings

1. **Environment Variable**
   ```yaml
   environment:
     - CADDY_ADMIN_LISTEN=0.0.0.0:2019  # Required for external access
   ```
   This setting is crucial as it ensures the admin API is accessible from outside the container.

2. **Port Mapping**
   ```yaml
   ports:
     - "2019:2019"  # Format: "external:internal"
   ```
   You can customize the external port (e.g., "3019:2019") while keeping the internal port as 2019.

3. **App Configuration**
   ```yaml
   environment:
     - CADDY_API_URL=http://caddy:2019
   ```
   The app container uses the service name (`caddy`) and internal port for communication.

### Customizing Ports

To use a different external port for the admin API:

1. Modify the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "3019:2019"  # Changed external port to 3019
   ```

2. The internal configuration remains unchanged:
   ```yaml
   environment:
     - CADDY_ADMIN_LISTEN=0.0.0.0:2019
     # Internal communication still uses port 2019
   ```

### Volume Mounts

The following volumes are required:

```yaml
volumes:
  - ./data/caddy/data:/data
  - ./data/caddy/config:/config
  - ./data/certificates:/certificates
```

## Security Considerations

1. **Admin API Access**
   - Consider restricting access to the admin API port
   - Use firewall rules if needed
   - The admin API has no authentication by default

2. **Container Security**
   ```yaml
   security_opt:
     - no-new-privileges:true
   ```
   This prevents privilege escalation within containers.

## Troubleshooting

### Common Issues

1. **Admin API Not Accessible**
   - Verify `CADDY_ADMIN_LISTEN` is set to `0.0.0.0:2019`
   - Check port mappings in docker-compose.yml
   - Ensure no firewall rules are blocking access

2. **Container Communication**
   - Verify both containers are on the same network
   - Check the `CADDY_API_URL` environment variable
   - Use container names for internal communication

### Debugging Steps

1. Check container status:
   ```bash
   docker compose ps
   ```

2. View container logs:
   ```bash
   docker compose logs caddy
   docker compose logs app
   ```

3. Verify network connectivity:
   ```bash
   docker compose exec app ping caddy
   ```

4. Test admin API access:
   ```bash
   curl http://localhost:2019/config/
   ``` 