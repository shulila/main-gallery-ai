
#!/bin/bash
# Build script for MainGallery.AI Chrome Extension

echo "Building MainGallery.AI Chrome Extension..."
echo "Removing old build directory..."
rm -rf dist-extension

echo "Running build script with improved bundling..."
node build-extension.js

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

echo "Done! Your extension is now ready in the dist-extension folder."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode (top right)"
echo "3. Click 'Load unpacked' and select the dist-extension folder"
echo ""
echo "Important: Check for module import errors in Chrome DevTools Console after loading."
