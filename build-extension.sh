
#!/bin/bash

# Build script for the MainGallery Chrome extension
# This script:
# 1. Runs necessary checks for alias imports
# 2. Performs the Vite build
# 3. Copies necessary files to the dist directory

echo "🔍 Checking for alias imports in chrome-extension files..."

# Function to check for alias imports in a file
check_alias_imports() {
  local file=$1
  if grep -q "@/" "$file"; then
    echo "❌ ERROR: Alias import found in $file"
    echo "   Please replace '@/' imports with relative paths."
    grep -n "@/" "$file"
    exit 1
  fi
}

# Function to check for correct exports in supabaseClient.js
check_supabase_exports() {
  local file="src/chrome-extension/utils/supabaseClient.js"
  if [ -f "$file" ]; then
    if ! grep -q "export const supabase = supabaseClient" "$file"; then
      echo "❌ ERROR: Missing named export 'supabase' in $file"
      echo "   Please ensure the file has both default export and named export."
      echo "   Example: export const supabase = supabaseClient;"
      exit 1
    fi
    
    if ! grep -q "export default supabaseClient" "$file"; then
      echo "❌ ERROR: Missing default export in $file"
      echo "   Please ensure the file has both default export and named export."
      echo "   Example: export default supabaseClient;"
      exit 1
    fi
  else
    echo "❌ ERROR: $file not found"
    exit 1
  fi
}

# Check chrome-extension files
find src/chrome-extension -type f -name "*.js" | while read file; do
  check_alias_imports "$file"
done

# Check auth-related files
check_alias_imports "src/components/auth/AuthCallbackHandler.tsx"
check_alias_imports "src/pages/AuthCallback.tsx"
check_alias_imports "src/pages/auth/callback.tsx"
check_alias_imports "src/utils/authTokenHandler.ts"

# Check for correct supabase exports
check_supabase_exports

echo "✅ Alias import checks passed!"

# Build the extension
echo "🔨 Building extension..."
npm run build -- --mode=extension

# Verify that the build succeeded
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build completed successfully!"

# Additional steps for extension package
echo "📦 Preparing extension package..."

# Verify critical files exist
if [ ! -f "dist/manifest.json" ]; then
  echo "❌ ERROR: manifest.json not found in dist/"
  exit 1
fi

if [ ! -f "dist/background.js" ]; then
  echo "❌ ERROR: background.js not found in dist/"
  exit 1
fi

if [ ! -f "dist/popup.html" ]; then
  echo "❌ ERROR: popup.html not found in dist/"
  exit 1
fi

echo "✅ Extension package prepared successfully!"
echo "📂 Extension is ready in the dist/ directory"
echo "⚙️  You can load it in Chrome by going to chrome://extensions, enabling Developer mode, and clicking 'Load unpacked'"
