
#!/bin/bash
# Build script for MainGallery.AI Chrome Extension

# Check if this is a preview build
if [[ "$1" == "--preview" || "$1" == "-p" ]]; then
  echo "Building MainGallery.AI Chrome Extension for PREVIEW environment..."
  BUILD_ENV=preview
else
  echo "Building MainGallery.AI Chrome Extension for PRODUCTION environment..."
  BUILD_ENV=production
fi

echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script with improved bundling..."
if [[ "$BUILD_ENV" == "preview" ]]; then
  # Pass environment flag to the build script
  node build-extension.js --preview
else
  node build-extension.js
fi

echo "Making post-build fixes for module support..."
# Ensure all JS files in dist-extension have type="module"
# This is for any HTML files that might include scripts
find dist-extension -name "*.html" -exec sed -i 's/<script /<script type="module" /g' {} \;

# Ensure content.js and background.js have the proper module syntax
for file in dist-extension/content.js dist-extension/background.js; do
  if [ -f "$file" ]; then
    # Check if the file already has module syntax
    if ! grep -q "export" "$file" && ! grep -q "import" "$file"; then
      # Add module exports wrapper if needed
      echo "// Ensuring module compatibility" > "$file.temp"
      cat "$file" >> "$file.temp"
      mv "$file.temp" "$file"
    fi
  fi
done

echo "Copying utility files..."
mkdir -p dist-extension/utils
cp -r src/chrome-extension/utils/*.js dist-extension/utils/

# Inject environment information into manifest.json
if [[ "$BUILD_ENV" == "preview" ]]; then
  echo "Injecting PREVIEW environment information into manifest.json..."
  # sed command to modify manifest.json name and description to indicate preview
  if [ -f "dist-extension/manifest.json" ]; then
    sed -i 's/"name": "MainGallery.AI"/"name": "MainGallery.AI (Preview)"/g' dist-extension/manifest.json
    sed -i 's/"description": "Unified AI image gallery for multiple AI art platforms"/"description": "Unified AI image gallery for multiple AI art platforms - PREVIEW BUILD"/g' dist-extension/manifest.json
  fi
fi

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
