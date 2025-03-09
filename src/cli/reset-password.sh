#!/bin/bash

# ClearProxy Password Reset Tool
# A simple tool for resetting user passwords in the ClearProxy application
# Usage: ./reset-password.sh --email user@example.com --password newpassword

set -e

show_usage() {
  echo "ClearProxy Password Reset Tool"
  echo ""
  echo "Usage:"
  echo "  ./reset-password.sh --email user@example.com --password newpassword"
  echo ""
  echo "Options:"
  echo "  --email     User's email address (required)"
  echo "  --password  New password (required)"
  echo "  --help      Show this help text"
  echo ""
}

# Parse command line arguments
EMAIL=""
PASSWORD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$EMAIL" ]; then
  echo "Error: Email is required (--email)"
  show_usage
  exit 1
fi

if [ -z "$PASSWORD" ]; then
  echo "Error: Password is required (--password)"
  show_usage
  exit 1
fi

# Define database path (relative to project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DB_PATH="$PROJECT_ROOT/clearproxy.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

# Find the user in the database
echo "Looking up user with email: $EMAIL"
USER_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM users WHERE email = '$EMAIL' LIMIT 1;")

if [ -z "$USER_ID" ]; then
  echo "Error: User not found with email: $EMAIL"
  exit 1
fi

USER_NAME=$(sqlite3 "$DB_PATH" "SELECT name FROM users WHERE id = $USER_ID;")
echo "Found user: $USER_NAME (ID: $USER_ID)"

# Generate password hash using SHA-256 to match the application's hashing method
echo "Generating password hash..."
PASSWORD_HASH=$(node -e "
// Use the same SHA-256 hashing that the application uses
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('$PASSWORD').digest('hex');
console.log(hash);
")

if [ -z "$PASSWORD_HASH" ]; then
  echo "Error: Failed to generate password hash"
  exit 1
fi

# Update the user's password in the database
echo "Updating password in database..."
CURRENT_TIME=$(date +%s)  # Unix timestamp in seconds
sqlite3 "$DB_PATH" "UPDATE users SET password_hash = '$PASSWORD_HASH', updated_at = $CURRENT_TIME WHERE id = $USER_ID;"

echo "Password successfully reset for $EMAIL"
exit 0 