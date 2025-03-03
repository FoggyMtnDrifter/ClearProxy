# Getting Started with ClearProxy

This guide will help you get ClearProxy up and running quickly.

## What is ClearProxy?

ClearProxy is a modern, web-based management interface for [Caddy](https://caddyserver.com/), focusing on reverse proxy configuration with automatic HTTPS. It simplifies the process of setting up and managing reverse proxies with a user-friendly interface.

## Installation Options

### Using Docker (Recommended)

The easiest way to get started with ClearProxy is using Docker and Docker Compose.

1. **Create a new directory and download the docker-compose.yml:**

```bash
mkdir clearproxy && cd clearproxy
curl -L https://raw.githubusercontent.com/foggymtndrifter/clearproxy/main/docker-compose.yml -o docker-compose.yml
```

2. **Create required directories and configuration:**

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

3. **Start the application:**

```bash
docker compose up -d
```

4. **Access the ClearProxy interface:**

   Open your browser and navigate to `http://localhost:3000`

5. **Create your admin account:**

   When you first access ClearProxy, you'll be prompted to create an admin account since no users exist in the database.

### Manual Installation

For advanced users who prefer to run the application without Docker:

1. **Prerequisites:**

   - Node.js 20 or later
   - Caddy server installed and accessible
   - SQLite

2. **Clone the repository:**

```bash
git clone https://github.com/foggymtndrifter/clearproxy.git
cd clearproxy
```

3. **Install dependencies:**

```bash
npm install
```

4. **Configure environment variables:**

Create a `.env` file with the following contents:

```
CADDY_API_URL=http://localhost:2019
DATABASE_PATH=.
LOG_LEVEL=info
CADDY_ADMIN_LISTEN=0.0.0.0:2019
```

5. **Start the application:**

```bash
npm run build
npm run start
```

6. **Access the ClearProxy interface:**

   Open your browser and navigate to `http://localhost:3000`

## Initial Configuration

After installation, you'll need to complete a few basic steps:

1. **Set up your first proxy host:**

   - Go to the "Proxy Hosts" section
   - Click "Add Host"
   - Enter your domain name (e.g., example.com)
   - Enter the target details (host, port, protocol)
   - Configure SSL settings if needed
   - Enable security settings if you want to password-protect your service
   - Click "Create Host"

2. **Configure your DNS:**
   - Ensure your domain's DNS records point to the server where ClearProxy is installed
   - For local testing, you can add entries to your hosts file

## Next Steps

Once you have ClearProxy running, check out these guides:

- [Proxy Hosts](./proxy-hosts.md) - Learn how to manage your proxy configurations
- [Authentication](./authentication.md) - How to secure your admin interface and proxied services
- [Advanced Configuration](./advanced-configuration.md) - Add custom JSON configuration for advanced use cases
