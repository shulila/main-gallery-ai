
#!/bin/bash

# Create assets directory if it doesn't exist
mkdir -p assets/icons

# Copy all basic icon files
cp icons/icon16.png assets/icons/
cp icons/icon48.png assets/icons/
cp icons/icon128.png assets/icons/

# Copy social media icons
cp icons/facebook-icon.svg assets/icons/
cp icons/google-icon.svg assets/icons/

# Make script executable
chmod +x copy-icons.sh

echo "Icons copied successfully to assets/icons directory."
echo "Please ensure you've updated manifest.json to reference these new paths."
