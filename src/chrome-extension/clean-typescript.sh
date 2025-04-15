
#!/bin/bash

# Script to clean up TypeScript files and duplicates from the extension directory

echo "Cleaning up TypeScript files from chrome-extension directory..."

# Remove TypeScript files
find ./src/chrome-extension -name "*.ts" -type f -delete

# Remove duplicate auth-service.js from utils directory
if [ -f "./src/chrome-extension/utils/auth-service.js" ]; then
  rm ./src/chrome-extension/utils/auth-service.js
  echo "Removed duplicate auth-service.js from utils directory"
fi

# Remove duplicate auth-service.js from utils/auth directory
if [ -f "./src/chrome-extension/utils/auth/auth-service.js" ]; then
  rm ./src/chrome-extension/utils/auth/auth-service.js
  echo "Removed duplicate auth-service.js from utils/auth directory"
fi

echo "Cleanup complete!"
