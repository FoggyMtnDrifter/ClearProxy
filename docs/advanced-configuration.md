# Advanced Configuration for Proxy Hosts

ClearProxy allows you to extend the basic proxy configuration with advanced Caddy server directives. This feature is designed for power users who need more control over their proxy settings.

## Overview

The Advanced Configuration option lets you specify custom Caddy directives in JSON format, providing access to Caddy's full feature set without leaving the ClearProxy interface.

## Enabling Advanced Configuration

1. Navigate to the Proxy Hosts page
2. When creating or editing a host, toggle on "Advanced Configuration"
3. Enter your custom configuration in the text area
4. Save your changes

## Configuration Format

The advanced configuration uses Caddy's JSON API format. ClearProxy supports several configuration formats:

### 1. Array of Routes

```json
[
  {
    "match": [
      {
        "path": ["/api/*"]
      }
    ],
    "handle": [
      {
        "handler": "reverse_proxy",
        "upstreams": [{ "dial": "backend-api:8080" }]
      }
    ],
    "terminal": true
  },
  {
    "match": [
      {
        "path": ["/admin/*"]
      }
    ],
    "handle": [
      {
        "handler": "reverse_proxy",
        "upstreams": [{ "dial": "admin-server:3000" }]
      }
    ],
    "terminal": true
  }
]
```

### 2. Legacy Redirect Format

```json
{
  "redir": [
    {
      "from": "/old-page",
      "to": "/new-page",
      "status_code": 301
    },
    {
      "from": "/deprecated/*",
      "to": "/v2/{1}",
      "status_code": 302
    }
  ]
}
```

### 3. Single Route Configuration

```json
{
  "match": [
    {
      "path": ["/static/*"]
    }
  ],
  "handle": [
    {
      "handler": "file_server",
      "root": "/var/www/static"
    }
  ],
  "terminal": true
}
```

### 4. Direct Handler Configuration

```json
{
  "handler": "headers",
  "response": {
    "set": {
      "X-Frame-Options": ["SAMEORIGIN"],
      "X-Content-Type-Options": ["nosniff"],
      "Strict-Transport-Security": ["max-age=31536000; includeSubDomains; preload"]
    }
  }
}
```

## Common Use Cases

### Custom Headers

```json
{
  "handler": "headers",
  "response": {
    "set": {
      "X-Frame-Options": ["SAMEORIGIN"],
      "Content-Security-Policy": ["default-src 'self'"],
      "X-XSS-Protection": ["1; mode=block"]
    }
  }
}
```

### URL Rewrites

```json
{
  "handler": "rewrite",
  "uri_replace": [
    {
      "search": "^/blog/([0-9]+)/([a-z]+)",
      "replace": "/posts/$1-$2"
    }
  ]
}
```

### Response Compression

```json
{
  "handler": "encode",
  "encodings": {
    "gzip": true,
    "zstd": true
  }
}
```

### Path-Based Routing

```json
{
  "match": [
    {
      "path": ["/api/*"]
    }
  ],
  "handle": [
    {
      "handler": "reverse_proxy",
      "upstreams": [{ "dial": "api-server:8000" }]
    }
  ],
  "terminal": true
}
```

### Error Pages

```json
{
  "handler": "handle_errors",
  "error_pages": {
    "404": "/path/to/404.html",
    "500": "/path/to/500.html"
  }
}
```

## Advanced Handler Types

ClearProxy supports all Caddy handlers, including:

- `reverse_proxy` - For proxying requests to upstream servers
- `static_response` - For returning static HTTP responses
- `file_server` - For serving files from the filesystem
- `authentication` - For various authentication methods
- `headers` - For manipulating HTTP headers
- `encode` - For response compression
- `rewrite` - For URL manipulation
- `handle_errors` - For custom error pages
- `templates` - For template-based responses
- And more...

## Notes and Limitations

1. The `host` field is automatically populated with the domain name you specify in the basic configuration.
2. Advanced configurations are applied before the standard reverse proxy configuration.
3. Setting `terminal: true` will prevent further routing rules from being applied.
4. Invalid configurations may prevent your proxy from working correctly.
5. Any syntax errors in your JSON will cause the configuration to be ignored.

## Troubleshooting

If your advanced configuration isn't working:

1. Verify that your JSON is valid
2. Check the ClearProxy logs for configuration errors
3. Ensure that your paths and patterns are correct
4. Make sure the services you're proxying to are accessible

## Examples

### Custom Error Handling

```json
{
  "handler": "handle_errors",
  "error_pages": {
    "404": "/custom/404.html",
    "500": "/custom/500.html"
  }
}
```

### Rate Limiting

```json
{
  "handler": "rate_limit",
  "zone": "mylimiter",
  "rate": "10r/s",
  "burst": 20
}
```

### Load Balancing

```json
{
  "handler": "reverse_proxy",
  "upstreams": [
    { "dial": "server1:8080" },
    { "dial": "server2:8080" },
    { "dial": "server3:8080" }
  ],
  "load_balancing": {
    "selection_policy": { "name": "round_robin" }
  }
}
```

For more details about Caddy's configuration options, refer to the [official Caddy documentation](https://caddyserver.com/docs/json/). 