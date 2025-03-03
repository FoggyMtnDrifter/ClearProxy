# Frequently Asked Questions

## General

### What is ClearProxy?

ClearProxy is a modern, web-based management interface for [Caddy](https://caddyserver.com/), focusing on reverse proxy configuration with automatic HTTPS. It provides an easy-to-use UI for managing Caddy's reverse proxy capabilities.

### Is ClearProxy free and open source?

Yes, ClearProxy is completely free and open-source software. It's released under the MIT License, which allows for both personal and commercial use.

### What are the system requirements?

ClearProxy is designed to be lightweight. Minimal requirements are:

- 1 CPU core
- 512MB RAM
- 1GB disk space
- Modern web browser
- Network connectivity to your target services

### What is the difference between ClearProxy and Caddy?

Caddy is the underlying web server that handles the actual proxying, automatic HTTPS, and serving content. ClearProxy is a management interface that makes it easy to configure Caddy for reverse proxy purposes through a user-friendly web UI.

## Installation

### Do I need to install Caddy separately?

No, when using the recommended Docker installation, Caddy is included in the docker-compose setup. For manual installations, you'll need to install and configure Caddy separately.

### Can I use ClearProxy on Windows/Mac/Linux?

Yes, ClearProxy can run on any operating system that supports Docker or Node.js. The recommended installation method using Docker is cross-platform.

### Is there a hosted/cloud version available?

No, ClearProxy is designed to be self-hosted. There's no official hosted or cloud version available.

### How do I update ClearProxy?

For Docker installations:

```bash
docker compose pull
docker compose up -d
```

For manual installations:

```bash
git pull
npm install
npm run build
npm run start
```

## Features

### Does ClearProxy support automatic HTTPS?

Yes, ClearProxy leverages Caddy's built-in ACME client to automatically obtain and renew SSL/TLS certificates from Let's Encrypt or ZeroSSL.

### Can I use my own SSL certificates?

Yes, you can use custom SSL certificates by adding custom JSON configuration to your proxy host. See the [Advanced Configuration](./advanced-configuration.md) guide for details.

### Does ClearProxy support HTTP/2 or HTTP/3?

Yes, ClearProxy supports both HTTP/2 and HTTP/3. You can enable or disable these protocols on a per-proxy host basis in the SSL/TLS settings.

### Can I password-protect my proxied services?

Yes, ClearProxy supports HTTP Basic Authentication for any proxied service. You can enable this with the Security toggle in proxy host settings and provide a username and password.

### Does ClearProxy support WebSockets?

Yes, WebSockets are supported for proxied applications. Caddy automatically handles WebSocket connections.

### Can I add custom headers to requests?

While there's no direct UI for adding custom headers, you can add them through the Advanced Configuration section using JSON configuration. See the [Advanced Configuration](./advanced-configuration.md) guide for examples.

## Configuration

### How do I add a new domain/service?

1. Go to the Proxy Hosts section
2. Click "Add Host"
3. Enter your domain name and target service details
4. Click "Create Host"

### Does ClearProxy modify my existing Caddy configuration?

ClearProxy manages the Caddy configuration through Caddy's Admin API. If you're using an existing Caddy server, ClearProxy will add its routes to your configuration but won't delete existing routes that it didn't create.

### Where is my data stored?

For Docker installations, data is stored in:

- `./data/clearproxy.db`: SQLite database with ClearProxy settings
- `./data/caddy/data`: Caddy's data including certificates
- `./data/caddy/config`: Caddy's configuration files

### Can I back up my configuration?

Yes, you can back up:

1. The SQLite database file (`clearproxy.db`) which contains your ClearProxy settings
2. Caddy's data directory for certificates

For Docker installations, backing up the entire `data` directory is recommended.

## Troubleshooting

### I can't access my proxy host - what should I check?

1. Verify that your domain's DNS records point to the server where ClearProxy is installed
2. Check that your target service is running and accessible
3. Review the logs for errors (`docker compose logs caddy`)
4. Verify that ports 80 and 443 are open on your firewall

### How do I access logs to troubleshoot issues?

For Docker installations:

```bash
# Application logs
docker compose logs app

# Caddy logs
docker compose logs caddy
```

### I forgot my admin password - what now?

If you've forgotten your password, you will need to access the SQLite database file directly and update the user credentials. For Docker installations, you can use a SQLite client to modify the `clearproxy.db` file.

### Why am I getting "502 Bad Gateway" errors?

This typically means Caddy cannot reach your target service. Check:

1. The target service is running
2. The host, port, and protocol are correct
3. Network connectivity between Caddy and the target
4. Firewall rules aren't blocking connections

For Docker networks, make sure you're not using "localhost" for services in other containers - use the container name or network IP instead.

## Integration

### Can I use ClearProxy with other web servers?

ClearProxy is specifically designed for managing Caddy's reverse proxy capabilities. It doesn't directly support other web servers like Nginx or Apache.

### Can I run ClearProxy and my applications on different servers?

Yes, you can install ClearProxy on one server and proxy to applications running on other servers, as long as there's network connectivity between them.

### Does ClearProxy work with Docker Swarm or Kubernetes?

ClearProxy can be adapted to work with orchestration platforms, but the standard installation is designed for single-server Docker Compose deployments. For Kubernetes, you might consider using Caddy's native Kubernetes ingress controller instead.

### Can ClearProxy automatically discover Docker containers?

No, ClearProxy doesn't currently have automatic service discovery for Docker containers. You need to manually configure proxy hosts for your services.

## Support and Community

### Where can I get help if I'm having issues?

- [GitHub Issues](https://github.com/foggymtndrifter/clearproxy/issues) for bugs and feature requests
- [GitHub Discussions](https://github.com/foggymtndrifter/clearproxy/discussions) for general questions and community support

### How can I contribute to ClearProxy?

Check out the [CONTRIBUTING.md](https://github.com/foggymtndrifter/clearproxy/blob/main/CONTRIBUTING.md) file in the GitHub repository for guidelines on contributing to the project.

### Is there a roadmap for future features?

The project's roadmap and planned features are typically tracked in the GitHub repository's issues and project boards.

### Can I use ClearProxy for commercial purposes?

Yes, ClearProxy is released under the MIT License, which allows for commercial use.
