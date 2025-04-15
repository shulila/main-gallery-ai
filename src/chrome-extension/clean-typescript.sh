
#!/bin/bash

# Remove TypeScript files
echo "Removing TypeScript files..."
find . -name "*.ts" -not -name "*.d.ts" -delete
echo "TypeScript files removed."

# Create assets directory
echo "Creating assets directory..."
mkdir -p assets/icons
echo "Assets directory created."

# Copy existing icons to the new directory
echo "Copying existing icons..."
cp -r icons/* assets/icons/
echo "Icons copied."

# Ensure the script is executable
chmod +x clean-typescript.sh

echo "Cleanup completed. Please build the extension again."
