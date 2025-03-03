# Authentication in ClearProxy

This guide covers authentication options for both the ClearProxy admin interface and your proxy hosts.

## Admin Interface Authentication

By default, the ClearProxy admin interface requires authentication to prevent unauthorized access to your proxy configurations.

### Default Credentials

When you first set up ClearProxy, you'll need to create your admin account. If no users exist in the database, you'll need to create one by clicking on the registration option.

### Changing Admin Credentials

This functionality is not yet available in ClearProxy, but it will be available before our stable release.

### User Management

The current version of ClearProxy uses a simple authentication model with email and password. The database schema supports multiple users and an admin flag, but the UI for managing multiple users may be implemented in future versions.

## Proxy Host Authentication

ClearProxy supports HTTP Basic Authentication for individual proxy hosts, allowing you to password-protect access to your proxied services.

### Enabling Basic Authentication for a Proxy Host

1. Navigate to the **Proxy Hosts** section
2. Edit the proxy host you want to protect or create a new one
3. Enable the **Basic Authentication** toggle
4. Enter a username and password in the fields that appear
5. Click **Save** to apply the configuration

### Authentication Implementation Details

- Passwords for basic authentication are securely hashed using bcrypt
- The authentication is implemented using Caddy's built-in HTTP basic authentication handler
- When enabled, all requests to the proxy host will require authentication

### Authentication Prompt

When basic authentication is enabled, visitors to your proxied service will see a browser authentication prompt. They must enter valid credentials to access the service.

### Security Considerations

- Basic Authentication sends credentials encoded (not encrypted) unless used with HTTPS
- ClearProxy automatically configures HTTPS for your domains when SSL is enabled, ensuring credentials are encrypted in transit
- Passwords are stored securely in the ClearProxy database using bcrypt hashing
- Consider using strong, unique passwords for each proxy host

## Troubleshooting Authentication Issues

### Admin Interface Authentication Problems

If you're having trouble logging into the admin interface:

1. **Forgotten Credentials**: If you've forgotten your password and there is no reset mechanism implemented yet, you may need to:

   - Access the SQLite database file directly and update the user credentials
   - For Docker installations: Use a SQLite client to modify the `clearproxy.db` file
   - Consider adding a column to update the `password_hash` value

2. **Login Issues**: If you're unable to log in despite having correct credentials:
   - Check for browser issues (clear cache/cookies)
   - Ensure the service is running properly (check logs)
   - Verify that the database is accessible (check logs for database connection errors)

### Proxy Host Authentication Problems

Common issues with proxy host authentication:

1. **Credentials Not Working**:

   - Verify the username and password are correctly configured
   - Ensure the authentication settings were saved and applied
   - Check the Caddy logs for authentication-related errors

2. **Authentication Prompt Not Appearing**:

   - Verify that basic authentication is enabled for the proxy host
   - Check that the Caddy configuration was successfully updated
   - Review logs for any configuration errors

3. **Authentication Bypasses**:
   - Check if you have custom configurations that might override the authentication settings
   - Verify that all routes to the service properly enforce authentication
