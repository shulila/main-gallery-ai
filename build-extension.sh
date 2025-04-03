
#!/bin/bash
# Simple shell script to build the Chrome extension

echo "Building MainGallery.AI Chrome Extension..."
echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script..."
node build-extension.js

echo "Done! Your extension is now ready in the dist-extension folder."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode (top right)"
echo "3. Click 'Load unpacked' and select the dist-extension folder"
