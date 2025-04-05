/**
 * MainGallery.AI Chrome Extension Build Script
 * 
 * This script organizes extension files into a proper structure for loading as an unpacked extension.
 * Run with: node build-extension.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if this is a preview build
const isPreviewBuild = process.env.BUILD_ENV === 'preview' || 
                      process.argv.includes('--preview') || 
                      process.argv.includes('-p');

console.log(`Building for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment`);

// Configuration
const OUTPUT_DIR = 'dist-extension';
const SOURCE_DIR = 'src/chrome-extension';
const ICONS_DIR = `${SOURCE_DIR}/icons`;

// Step 1: Run Vite build with 'extension' mode
console.log('Building extension with Vite...');
try {
  execSync('npx vite build --mode extension', { stdio: 'inherit' });
  console.log('Vite build completed successfully');
} catch (error) {
  console.error('Error building extension with Vite:', error);
  process.exit(1);
}

// Step 2: Ensure output directory exists
console.log('Creating extension build directory structure...');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Create subdirectories if they don't exist
fs.mkdirSync(`${OUTPUT_DIR}/icons`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/src/config`, { recursive: true });

// Step 3: Copy and modify manifest - Special handling for preview vs production
console.log('Copying and configuring manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestContent);

// Update manifest based on environment
if (isPreviewBuild) {
  manifest.name = manifest.name + ' (Preview)';
  manifest.description = manifest.description + ' - PREVIEW BUILD';
  
  // Store environment type in manifest
  if (!manifest.storage) {
    manifest.storage = {};
  }
  manifest.storage.managed_schema = "environment.json";
  
  // Create environment schema file
  const envSchema = {
    "type": "object",
    "properties": {
      "environment": {
        "type": "string",
        "default": "preview"
      }
    }
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.json'), JSON.stringify(envSchema, null, 2));
}

// Always ensure service worker is treated as a module
if (manifest.background) {
  manifest.background.type = "module";
}

// Make sure content scripts are correctly configured
if (manifest.content_scripts && manifest.content_scripts.length > 0) {
  manifest.content_scripts.forEach(script => {
    script.type = "module";
  });
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 4: Copy popup files
console.log('Copying popup files...');
['popup.html', 'popup.css', 'popup.js'].forEach(file => {
  try {
    fs.copyFileSync(
      path.join(SOURCE_DIR, file),
      path.join(OUTPUT_DIR, file)
    );
    console.log(`Copied ${file}`);
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 5: Copy icons
console.log('Copying icons...');
['icon16.png', 'icon48.png', 'icon128.png', 'google-icon.svg', 'facebook-icon.svg'].forEach(iconFile => {
  try {
    const sourcePath = path.join(ICONS_DIR, iconFile);
    const destPath = path.join(OUTPUT_DIR, 'icons', iconFile);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied icon: ${iconFile}`);
    } else {
      console.warn(`Warning: Icon file not found: ${iconFile}`);
      // Create placeholder file if it's a required icon
      if (['icon16.png', 'icon48.png', 'icon128.png'].includes(iconFile)) {
        console.log(`Creating empty placeholder for required icon: ${iconFile}`);
        fs.writeFileSync(destPath, '');
      }
    }
  } catch (e) {
    console.warn(`Warning: Error copying icon ${iconFile}: ${e.message}`);
  }
});

// Step 6: Copy utility files (that might not be bundled with Vite)
console.log('Copying utility files...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');

try {
  if (fs.existsSync(UTILS_SOURCE)) {
    const utilFiles = fs.readdirSync(UTILS_SOURCE);
    utilFiles.forEach(file => {
      if (file.endsWith('.js')) {
        // Read the file content
        let content = fs.readFileSync(path.join(UTILS_SOURCE, file), 'utf8');
        
        // If this is the urlUtils.js file, inject the environment setting
        if (file === 'urlUtils.js') {
          // Find the isPreviewEnvironment function
          const funcRegex = /export function isPreviewEnvironment\(\) \{([\s\S]*?)\}/;
          if (funcRegex.test(content)) {
            // Modify the function to force the correct environment
            const forcedEnvFunc = `export function isPreviewEnvironment() {
  // Environment forced during build
  return ${isPreviewBuild ? 'true' : 'false'};
}`;
            
            content = content.replace(funcRegex, forcedEnvFunc);
            console.log(`Injected forced environment (${isPreviewBuild ? 'preview' : 'production'}) into ${file}`);
          }
        }
        
        // Write the possibly modified file
        fs.writeFileSync(path.join(UTILS_DEST, file), content);
        console.log(`Copied util: ${file}`);
      }
    });
  } else {
    console.warn('Warning: utils directory not found at', UTILS_SOURCE);
  }
} catch (e) {
  console.warn('Warning: utils directory not found or empty:', e.message);
}

// Copy files to src/utils for proper imports
try {
  if (fs.existsSync(UTILS_SOURCE)) {
    const utilFiles = fs.readdirSync(UTILS_SOURCE);
    utilFiles.forEach(file => {
      if (file.endsWith('.js')) {
        // Read the file content
        let content = fs.readFileSync(path.join(UTILS_SOURCE, file), 'utf8');
        
        // If this is the urlUtils.js file, inject the environment setting
        if (file === 'urlUtils.js') {
          // Find the isPreviewEnvironment function
          const funcRegex = /export function isPreviewEnvironment\(\) \{([\s\S]*?)\}/;
          if (funcRegex.test(content)) {
            // Modify the function to force the correct environment
            const forcedEnvFunc = `export function isPreviewEnvironment() {
  // Environment forced during build
  return ${isPreviewBuild ? 'true' : 'false'};
}`;
            
            content = content.replace(funcRegex, forcedEnvFunc);
          }
        }
        
        // Write the possibly modified file
        fs.writeFileSync(path.join(OUTPUT_DIR, 'src', 'utils', file), content);
        console.log(`Copied util to src/utils: ${file}`);
      }
    });
  }
} catch (e) {
  console.warn('Warning: Could not copy files to src/utils:', e.message);
}

// Step 7: Copy content-injection.js if it exists
const contentInjectionSource = path.join(SOURCE_DIR, 'content-injection.js');
if (fs.existsSync(contentInjectionSource)) {
  fs.copyFileSync(
    contentInjectionSource,
    path.join(OUTPUT_DIR, 'content-injection.js')
  );
  console.log('Copied content-injection.js');
}

// Step 8: Ensure core JS files exist
['background.js', 'content.js', 'bridge.js'].forEach(file => {
  const sourcePath = path.join(SOURCE_DIR, file);
  const destPath = path.join(OUTPUT_DIR, file);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file}`);
      
      // Ensure module compatibility
      const content = fs.readFileSync(destPath, 'utf8');
      
      // Check if the file doesn't have import/export but should be a module
      if (!content.includes('import ') && !content.includes('export ')) {
        const moduleHeader = '// Ensure this file is treated as an ES module\n';
        fs.writeFileSync(destPath, moduleHeader + content);
        console.log(`Added module header to ${file}`);
      }
    } else {
      // Check if it's in the output from Vite build
      const viteBuildPath = path.join(OUTPUT_DIR, file);
      if (!fs.existsSync(viteBuildPath)) {
        console.error(`Warning: Could not find ${file} in source or build output`);
      } else {
        console.log(`${file} already exists in build output`);
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 9: Create environment.js file to explicitly set the environment
const environmentJs = `// Environment configuration - DO NOT MODIFY
export const ENVIRONMENT = "${isPreviewBuild ? 'preview' : 'production'}";
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-hub.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-hub.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-hub.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-hub.lovable.app/gallery'}";
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.js'), environmentJs);
console.log('Created environment.js with explicit environment settings');

// Also add to utils for proper imports
fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('Created utils/environment.js with explicit environment settings');

// Step 9: Ensure _redirects file exists for SPA routing in both the extension and web app
console.log('Creating _redirects file for SPA routing...');
const redirectsContent = '/*    /index.html   200';
const publicDir = 'public';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent);
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent);
console.log('_redirects files created successfully');

console.log(`Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);
console.log('To load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
console.log('');
console.log(`IMPORTANT: This is a ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} build that will connect to ${isPreviewBuild ? 'preview-main-gallery-ai.lovable.app' : 'main-gallery-hub.lovable.app'}`);

// Step 10: Write a post-build script to ensure module compatibility
const postBuildScriptPath = path.join(OUTPUT_DIR, 'fix-modules.js');
const postBuildScript = `
/**
 * Post-build script to fix module compatibility issues
 * Run this with: node fix-modules.js
 */
const fs = require('fs');
const path = require('path');

// Function to add module export to files that need it
function ensureModuleCompatibility(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // If the file doesn't have import/export statements, add a dummy export
  if (!content.includes('import ') && !content.includes('export ')) {
    console.log(\`Adding module export to \${filePath}\`);
    fs.writeFileSync(filePath, content + "\\n// Ensure module compatibility\\nexport const __moduleCheck = true;");
    return true;
  }
  
  return false;
}

// Check core files
['background.js', 'content.js', 'bridge.js'].forEach(file => {
  ensureModuleCompatibility(file);
});

// Check utils folder
const utilsDir = 'utils';
if (fs.existsSync(utilsDir)) {
  fs.readdirSync(utilsDir)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      ensureModuleCompatibility(path.join(utilsDir, file));
    });
}

console.log('Module compatibility check complete');
`;
fs.writeFileSync(postBuildScriptPath, postBuildScript);
console.log('Created post-build script for module compatibility');
