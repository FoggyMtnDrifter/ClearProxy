# Managing Proxy Hosts

Proxy hosts are the core feature of ClearProxy, allowing you to route external traffic to internal services with automatic HTTPS. This guide explains how to effectively manage your proxy hosts.

## What is a Proxy Host?

A proxy host is a configuration that tells Caddy how to handle requests for a specific domain. When a request comes in for that domain, Caddy will proxy it to the specified target service (host, port, and protocol).

## Adding a New Proxy Host

1. Navigate to the **Proxy Hosts** section
2. Click the **Add Host** button
3. Fill in the required fields:
   - **Domain Name**: The domain that visitors will use to access your service (e.g., `example.com`)
   - **Target Host**: The internal hostname or IP where your service is running (e.g., `localhost` or `192.168.1.100`)
   - **Target Port**: The port number your service is listening on (e.g., `8080`)
   - **Target Protocol**: The protocol to use when connecting to your service (HTTP or HTTPS)
4. Click **Create Host** to create the proxy host

## Proxy Host Settings

### Basic Settings

- **Domain Name**: The public domain name that will point to your service
- **Target Host**: The internal hostname or IP address of your service
- **Target Port**: The port number your service is listening on
- **Target Protocol**: Either HTTP or HTTPS, depending on what protocol your service uses
- **Ignore Invalid Certificate**: (When using HTTPS) Skip SSL certificate validation for the target service

### SSL/TLS Settings

ClearProxy automatically manages SSL/TLS certificates through Caddy's built-in ACME client. The following options are available:

- **SSL Enabled**: Enables or disables SSL/TLS for this proxy host
- **Force SSL**: Redirect all HTTP traffic to HTTPS
- **HTTP/2 Support**: Enable HTTP/2 protocol support
- **HTTP/3 Support**: Enable HTTP/3 protocol support

By default, Caddy will:

- Obtain certificates from Let's Encrypt
- Automatically renew certificates before they expire
- Configure redirects from HTTP to HTTPS when Force SSL is enabled

### Security Settings

You can protect your proxy hosts with HTTP Basic Authentication:

1. Enable the **Security** toggle
2. Enter a username and password
3. Click **Save**

This will require users to enter these credentials before accessing the proxied service.

## Managing Existing Proxy Hosts

From the Proxy Hosts list, you can:

- **Edit** a proxy host by clicking the edit icon
- **Delete** a proxy host by clicking the delete icon
- **Search** for a specific proxy host by domain, target, or port

## Advanced Configuration

For advanced users, ClearProxy supports custom JSON configuration snippets that can be added to your proxy host:

1. Enable the **Advanced Configuration** toggle in the proxy host settings
2. Enter your custom JSON configuration in the text area
3. Click **Save**

Example custom JSON snippet for security headers:

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
          "Referrer-Policy": ["strict-origin-when-cross-origin"]
        }
      }
    }
  ]
}
```

For more examples of advanced configuration, see the [Advanced Configuration](./advanced-configuration.md) documentation.

## Troubleshooting Proxy Hosts

If your proxy host isn't working as expected:

1. **Check DNS Settings**: Ensure your domain's DNS is correctly pointing to your server
2. **Check Target Service**: Make sure your target service is running and accessible
3. **Review Logs**: Check the Audit Logs section for any errors related to the proxy host
4. **SSL/TLS Issues**: For certificate problems, ensure your domain is publicly accessible
5. **Authentication Issues**: If using basic authentication, verify the credentials are correctly configured
