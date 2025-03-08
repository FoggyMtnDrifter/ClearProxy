#!/bin/bash

# Script to update logger imports from $lib/logger to $lib/utils/logger
# This script should be run from the project root directory

echo "Updating logger imports..."

# Find all TypeScript files and update the imports
find src -type f -name "*.ts" -exec sed -i '' 's/from '\''$lib\/logger'\''/from '\''$lib\/utils\/logger'\''/g' {} \;

echo "Logger imports updated successfully!" 