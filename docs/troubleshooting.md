# Troubleshooting ClearProxy

This guide covers common issues you might encounter when using ClearProxy and their solutions.

## Common Issues

### Installation Problems

#### Docker Installation Issues

**Issue**: Docker containers not starting properly.

**Solution**:

1. Check Docker logs for errors:
   ```bash
   docker compose logs app
   docker compose logs caddy
   ```
2. Verify that the required ports (80, 443, 2019, 3000) are not already in use by other services.
3. Ensure the directory structure and permissions are correct:
   ```bash
   mkdir -p data/caddy/data data/caddy/config/caddy data/certificates
   chmod -R 775 data
   ```
4. Try recreating the containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

**Issue**: Cannot access ClearProxy interface after installation.

**Solution**:

1. Verify that the containers are running:
   ```bash
   docker compose ps
   ```
2. Check that you're trying to access the correct URL (default: http://localhost:3000)
3. Check if the app container is binding to the correct interface:
   ```bash
   docker compose logs app | grep -i listen
   ```

### Proxy Host Problems

#### SSL Certificate Issues

**Issue**: Cannot obtain SSL certificates for domains.

**Solution**:

1. Ensure your domain's DNS records point to the server where ClearProxy is installed.
2. Verify that ports 80 and 443 are open on your firewall/security groups.
3. Check that your domain is publicly accessible (not internal only).
4. Review the Caddy logs for specific certificate errors:
   ```bash
   docker compose logs caddy | grep -i "certificate"
   ```
5. For local testing, consider using a `.test` TLD and add it to your hosts file.

#### Proxy Connection Issues

**Issue**: "502 Bad Gateway" errors when accessing a proxied service.

**Solution**:

1. Verify that the target service is running and accessible from the ClearProxy container:
   ```bash
   docker exec clearproxy-app curl -I http://target-host:port
   ```
2. Check that you've specified the correct target host, port, and protocol.
3. If the target is on the same server, use the appropriate Docker network or host IP (not "localhost").
4. Review the Caddy logs for connection errors:
   ```bash
   docker compose logs caddy | grep -i "error"
   ```

**Issue**: Service is accessible but assets/links are broken.

**Solution**:

1. Check if path forwarding is configured correctly.
2. Verify that the proxied application is generating correct relative URLs.
3. Consider adding custom headers to fix URL issues:
   ```
   X-Forwarded-Proto: https
   X-Forwarded-Host: your-domain.com
   ```

### Database Issues

**Issue**: Database errors or corruption.

**Solution**:

1. Check if the database file exists and has correct permissions:
   ```bash
   ls -la data/clearproxy.db
   ```
2. Backup the current database:
   ```bash
   cp data/clearproxy.db data/clearproxy.db.backup
   ```
3. Restart the application to trigger any pending migrations:
   ```bash
   docker compose restart app
   ```
4. If the database is severely corrupted, you may need to delete it and let ClearProxy create a new one (this will delete all your settings):
   ```bash
   mv data/clearproxy.db data/clearproxy.db.corrupted
   docker compose restart app
   ```

### UI/UX Issues

**Issue**: UI appears broken or has rendering issues.

**Solution**:

1. Clear your browser cache or try in incognito/private mode.
2. Try a different modern browser.
3. Check if you have browser extensions that might interfere with the UI.
4. Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge).

### Authentication Issues

**Issue**: Forgotten admin password.

**Solution**:
For Docker installations:

1. Access the database file:
   ```bash
   docker exec -it clearproxy-app sh
   cd /data
   sqlite3 clearproxy.db
   ```
2. In SQLite, reset the admin password (implementation details may vary):

   ```sql
   -- Check user table structure:
   .schema users

   -- Update password (example, implementation may vary):
   UPDATE users SET password_hash = 'new_hash_value' WHERE username = 'admin';

   -- Exit SQLite:
   .exit
   ```

## Performance Issues

**Issue**: High CPU/memory usage.

**Solution**:

1. Check which component is using resources:
   ```bash
   docker stats
   ```
2. If Caddy is using high resources, consider:
   - Reducing the number of proxy hosts
   - Simplifying complex Caddyfile snippets
3. If the app is using high resources, consider:
   - Restarting the container
   - Allocating more resources to Docker

## Advanced Troubleshooting

### Checking Caddy Configuration

To inspect the current Caddy configuration:

```bash
curl http://localhost:2019/config/ | jq
```

### Access Raw Caddy Admin API

For advanced troubleshooting, you can directly interact with the Caddy Admin API:

```bash
# Get current config
curl http://localhost:2019/config/

# Load a specific route
curl http://localhost:2019/config/apps/http/servers/srv0/routes/0
```

### Checking Database Content

For advanced users who need to inspect the database directly:

```bash
# Connect to SQLite database
docker exec -it clearproxy-app sh -c "sqlite3 /data/clearproxy.db"

# Inside SQLite
.tables
SELECT * FROM proxy_hosts;
.exit
```

### Logging and Debugging

To increase log verbosity:

1. Edit the environment variables for the app container in docker-compose.yml:
   ```yaml
   environment:
     - LOG_LEVEL=debug
   ```
2. Restart the container:
   ```bash
   docker compose restart app
   ```

## Getting Help

If you're still experiencing issues after following these troubleshooting steps:

1. Check the [GitHub Issues](https://github.com/foggymtndrifter/clearproxy/issues) for similar problems
2. Ask for help in [GitHub Discussions](https://github.com/foggymtndrifter/clearproxy/discussions)
3. When reporting issues, include:
   - ClearProxy version
   - Docker/Docker Compose version
   - Logs from both containers
   - Steps to reproduce the issue
   - Error messages/screenshots
