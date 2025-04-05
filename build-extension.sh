
#!/bin/bash
# Build script for MainGallery.AI Chrome Extension

# Check if this is a preview build
if [[ "$1" == "--preview" || "$1" == "-p" ]]; then
  echo "Building MainGallery.AI Chrome Extension for PREVIEW environment..."
  BUILD_ENV=preview
  PREVIEW_FLAG="--preview"
else
  echo "Building MainGallery.AI Chrome Extension for PRODUCTION environment..."
  BUILD_ENV=production
  PREVIEW_FLAG=""
fi

echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script with improved bundling..."
# Pass environment flag to the build script
node build-extension.js ${PREVIEW_FLAG}

echo "Making post-build fixes for module support..."
# Ensure all JS files in dist-extension have type="module"
# This is for any HTML files that might include scripts
find dist-extension -name "*.html" -exec sed -i 's/<script /<script type="module" /g' {} \;

echo "Validating build..."
# Check for expected files
if [ ! -f "dist-extension/manifest.json" ]; then
  echo "ERROR: manifest.json is missing from the build!"
  exit 1
fi

if [ ! -f "dist-extension/utils/urlUtils.js" ]; then
  echo "ERROR: urlUtils.js is missing from the build!"
  exit 1
fi

# Print environment info for verification
if [[ "$BUILD_ENV" == "preview" ]]; then
  echo ""
  echo "VERIFICATION: This is a PREVIEW build"
  echo "URLs should point to: https://preview-main-gallery-ai.lovable.app"
  
  # Verify environment.js contains preview URLs
  if grep -q "preview-main-gallery-ai.lovable.app" dist-extension/environment.js; then
    echo "✅ environment.js correctly contains preview URLs"
  else
    echo "❌ WARNING: environment.js may not contain preview URLs!"
  fi
  
  # Verify urlUtils.js is set to preview mode
  if grep -q "return true" dist-extension/utils/urlUtils.js; then
    echo "✅ urlUtils.js correctly set to preview mode"
  else
    echo "❌ WARNING: urlUtils.js may not be set to preview mode!"
  fi
else
  echo ""
  echo "VERIFICATION: This is a PRODUCTION build"
  echo "URLs should point to: https://main-gallery-hub.lovable.app"
  
  # Verify environment.js contains production URLs
  if grep -q "main-gallery-hub.lovable.app" dist-extension/environment.js; then
    echo "✅ environment.js correctly contains production URLs"
  else
    echo "❌ WARNING: environment.js may not contain production URLs!"
  fi
  
  # Verify urlUtils.js is set to production mode
  if grep -q "return false" dist-extension/utils/urlUtils.js; then
    echo "✅ urlUtils.js correctly set to production mode"
  else
    echo "❌ WARNING: urlUtils.js may not be set to production mode!"
  fi
fi

echo ""
echo "Done! Your extension is now ready in the dist-extension folder."
echo ""
echo "Environment: ${BUILD_ENV^^}"
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode (top right)"
echo "3. Click 'Load unpacked' and select the dist-extension folder"
echo ""
echo "IMPORTANT: This build will connect to ${BUILD_ENV^^} endpoints:"
if [[ "$BUILD_ENV" == "preview" ]]; then
  echo "- https://preview-main-gallery-ai.lovable.app"
else
  echo "- https://main-gallery-hub.lovable.app"
fi
