
#!/bin/bash

# Script to find and remove all TypeScript files from the chrome extension directory
# This helps prevent MIME type errors when loading the extension

echo "Finding all TypeScript files in src/chrome-extension..."
TS_FILES=$(find src/chrome-extension -name "*.ts" -o -name "*.tsx" -o -name "*.d.ts")

if [ -z "$TS_FILES" ]; then
  echo "No TypeScript files found."
  exit 0
fi

echo "Found the following TypeScript files:"
echo "$TS_FILES"

echo "Would you like to delete these files? [y/N]"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  find src/chrome-extension -name "*.ts" -o -name "*.tsx" -o -name "*.d.ts" -delete
  echo "TypeScript files deleted."
  echo "Make sure to run the build script to generate the extension."
else
  echo "Operation cancelled. No files were deleted."
fi
