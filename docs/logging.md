# Logging in ClearProxy

ClearProxy uses structured logging powered by [Pino](https://getpino.io/) to provide comprehensive logging capabilities. The logging system is designed to help with troubleshooting and monitoring in production environments.

## Configuration

### Environment Variables

You can configure the logging level using the `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug # For development
LOG_LEVEL=info  # For production (default)
```

### Log Levels

The application uses standard log levels:
- `error`: For errors that need immediate attention
- `warn`: For potentially harmful situations
- `info`: For general operational information
- `debug`: For detailed debugging information

## Log Files

Logs are stored in the `logs` directory:
- `logs/app.log`: Contains all application logs
- `logs/error.log`: Contains only error-level logs

## Components

The logging system is organized by components:
- `apiLogger`: API endpoint operations
- `authLogger`: Authentication and session management
- `dbLogger`: Database operations
- `caddyLogger`: Caddy server configuration and management

## Log Format

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

## Best Practices

### Development

During development:
- Use `LOG_LEVEL=debug` for detailed information
- Monitor `app.log` for all application activity
- Use structured logging fields for better debugging

### Production

In production:
- Use `LOG_LEVEL=info` by default
- Monitor `error.log` for critical issues
- Set up log rotation to manage file sizes
- Consider forwarding logs to a central logging system

### Log Management

- Regularly rotate log files to prevent disk space issues
- Archive old logs for compliance and debugging
- Use log analysis tools to monitor application health
- Set up alerts for error-level log entries

## Troubleshooting

Common logging issues and solutions:

1. **Missing Logs**
   - Check LOG_LEVEL setting
   - Verify write permissions on logs directory
   - Ensure disk space is available

2. **Performance Issues**
   - Reduce logging level in production
   - Implement log rotation
   - Monitor log file sizes

3. **Log Analysis**
   - Use `jq` for JSON log parsing
   - Set up log aggregation tools
   - Monitor error rates and patterns 