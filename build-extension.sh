
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
  
  # Check content of background.js for any remaining @/ imports
  if grep -q "@/integrations/supabase/client" dist/background.js; then
    echo "❌ ERROR: background.js still contains @/ imports that will cause it to fail!"
    echo "Please check vite.config.ts to ensure all imports are being properly converted."
    exit 1
  else
    echo "✅ No problematic @/ imports found in background.js"
  fi
fi

if [ ! -f "dist/manifest.json" ]; then
  echo "❌ ERROR: manifest.json is missing from build!"
  exit 1
else
  echo "✅ manifest.json is present"
  
  # Validate manifest content
  if grep -q "\"type\": \"module\"" dist/manifest.json; then
    echo "✅ background.type is correctly set to 'module' in manifest.json"
  else
    echo "⚠️ Warning: background.type may not be correctly set to 'module' in manifest.json"
  fi
fi

if [ ! -d "dist/utils" ]; then
  echo "❌ ERROR: utils directory is missing from build!"
  exit 1
else
  echo "✅ utils directory is present"
fi

# Check for supabaseClient.js utility
if [ ! -f "dist/utils/supabaseClient.js" ]; then
  echo "⚠️ Warning: supabaseClient.js is missing from utils directory"
else
  echo "✅ supabaseClient.js is present in utils directory"
fi

echo "✅ Build completed successfully! Extension files are in the dist folder."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the dist folder"
