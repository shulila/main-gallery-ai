
#!/bin/bash

# Create assets directory if it doesn't exist
mkdir -p src/chrome-extension/assets/icons

# Copy all basic icon files to assets directory
cp src/chrome-extension/icons/icon16.png src/chrome-extension/assets/icons/
cp src/chrome-extension/icons/icon48.png src/chrome-extension/assets/icons/
cp src/chrome-extension/icons/icon128.png src/chrome-extension/assets/icons/

# Copy social media icons
cp src/chrome-extension/icons/facebook-icon.svg src/chrome-extension/assets/icons/
cp src/chrome-extension/icons/google-icon.svg src/chrome-extension/assets/icons/

# Make script executable
chmod +x src/chrome-extension/copy-icons.sh

echo "Icons copied successfully to assets/icons directory."
echo "Please ensure you've updated manifest.json to reference these new paths."
