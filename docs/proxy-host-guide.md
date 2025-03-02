# Proxy Host Configuration Guide

This guide explains how to set up and manage proxy hosts in ClearProxy, including basic and advanced configuration options.

## What are Proxy Hosts?

Proxy hosts in ClearProxy allow you to route incoming web traffic from a specific domain to a target backend service. This is useful for:

- Providing clean URLs for internal services
- Adding SSL/TLS encryption to services that don't support it
- Implementing basic authentication without modifying backend code
- Creating a unified access point for multiple services

## Basic Configuration

### Creating a New Proxy Host

1. Navigate to the **Proxy Hosts** page
2. Click the **Add Host** button
3. Enter the following required information:
   - **Domain**: The domain name that users will use to access your service (e.g., `example.com`)
   - **Target Host**: The hostname or IP address of your backend service (e.g., `192.168.1.100` or `internal-service`)
   - **Target Port**: The port number your backend service listens on (e.g., `8080`)
   - **Target Protocol**: Choose HTTP or HTTPS depending on your backend service

4. Configure additional options as needed:
   - **SSL**: Enable/disable SSL/TLS for the domain
   - **Force SSL**: Automatically redirect HTTP traffic to HTTPS
   - **HTTP/2 Support**: Enable HTTP/2 for improved performance
   - **HTTP/3 Support**: Enable HTTP/3 (QUIC) for even better performance
   - **Ignore Invalid Certificate**: Ignore SSL certificate validation errors when connecting to the backend (use with caution)

5. Click **Save** to create the proxy host

### Enabling Basic Authentication

To require username and password authentication:

1. Toggle on **Security** when creating or editing a proxy host
2. Enter a username and password
3. Save the proxy host configuration

## Advanced Configuration

For more complex setups, ClearProxy provides an advanced configuration option that gives you direct access to Caddy's powerful features.

### Enabling Advanced Configuration

1. When creating or editing a proxy host, toggle on **Advanced Configuration**
2. A text area will appear where you can enter Caddy directives in JSON format
3. Enter your custom configuration
4. Save the proxy host

### What You Can Do with Advanced Configuration

Advanced configuration allows you to:

- Add custom headers to requests and responses
- Implement URL rewrites and redirects
- Set up path-based routing to different backends
- Configure response compression
- Create custom error pages
- Implement rate limiting
- Configure load balancing
- And much more

For detailed examples and guidance, see the [Advanced Configuration Guide](advanced-configuration.md).

## Managing Proxy Hosts

### Editing a Proxy Host

1. Navigate to the **Proxy Hosts** page
2. Find the host you want to edit
3. Click the **Edit** button (pencil icon)
4. Make your changes
5. Click **Save** to apply changes

### Enabling/Disabling a Proxy Host

1. Navigate to the **Proxy Hosts** page
2. Find the host you want to enable/disable
3. Toggle the **Enabled** switch

### Deleting a Proxy Host

1. Navigate to the **Proxy Hosts** page
2. Find the host you want to delete
3. Click the **Delete** button (trash icon)
4. Confirm the deletion

## Troubleshooting

If you encounter issues with your proxy hosts:

1. Check the ClearProxy logs for error messages
2. Verify that your backend service is running and accessible
3. Make sure your domain DNS is correctly configured
4. For SSL issues, ensure your domain is publicly accessible (for Let's Encrypt validation)
5. If using advanced configuration, verify your JSON syntax is correct

## Additional Resources

- [Advanced Configuration Guide](advanced-configuration.md)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [SSL/TLS Best Practices](https://caddyserver.com/docs/automatic-https) 