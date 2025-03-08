# ClearProxy CLI Tools

This directory contains command-line tools for administering and managing ClearProxy.

## Password Reset Tool

The `reset-password.sh` script allows administrators to reset user passwords directly from the command line. This is particularly useful for recovering admin access or helping users who have forgotten their passwords.

### Prerequisites

- Bash shell environment
- SQLite3 command-line tool
- Node.js (for password hashing)

### Usage

```bash
./reset-password.sh --email user@example.com --password newpassword
```

### Options

- `--email` - The email address of the user whose password you want to reset (required)
- `--password` - The new password to set for the user (required)
- `--help` - Display help information

### Examples

Reset an admin user's password:

```bash
./reset-password.sh --email admin@example.com --password secure_password_123
```

### How It Works

The script:

1. Looks up the user by email in the SQLite database
2. Generates a SHA-256 hash of the new password using Node.js (matching the application's authentication)
3. Updates the user's password_hash field in the database
4. Updates the updated_at timestamp

### Troubleshooting

If you encounter issues with the script:

- Make sure the SQLite3 command-line tool is installed
- Verify the user email exists in the database
- Check that you have write permissions to the database file
- Ensure Node.js and bcryptjs are properly installed

### Security Notes

- This script provides direct access to modify user credentials
- It should only be used by system administrators
- Keep in mind that passwords entered on the command line may be visible in shell history
- For better security, consider using this script only on secure, trusted environments
