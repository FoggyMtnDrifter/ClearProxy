#!/bin/sh
set -e

# Wait for a moment to ensure the database directory is available
sleep 1

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting the application..."
exec node build 