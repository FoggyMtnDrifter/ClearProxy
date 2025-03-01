#!/bin/sh
set -e

# Wait for a moment to ensure the database directory is available
sleep 1

# Run database initialization and migrations
echo "Running database initialization and migrations..."
node build/initialize.js

# Start the application
echo "Starting the application..."
exec node build 