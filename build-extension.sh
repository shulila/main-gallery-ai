
#!/bin/bash
# Simple script to build the MainGallery.AI Chrome Extension

echo "Building MainGallery.AI Chrome Extension..."

# Clean up previous build
echo "Cleaning up dist folder..."
rm -rf dist

# Run the Vite build with extension mode
echo "Running Vite build in extension mode..."
npx vite build --mode extension

echo "Verifying critical files..."
# Check for critical files
if [ ! -f "dist/background.js" ]; then
  echo "❌ ERROR: background.js is missing from build!"
  exit 1
else
  echo "✅ background.js is present"
fi

if [ ! -f "dist/manifest.json" ]; then
  echo "❌ ERROR: manifest.json is missing from build!"
  exit 1
else
  echo "✅ manifest.json is present"
fi

if [ ! -d "dist/utils" ]; then
  echo "❌ ERROR: utils directory is missing from build!"
  exit 1
else
  echo "✅ utils directory is present"
fi

echo "✅ Build completed successfully! Extension files are in the dist folder."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the dist folder"
