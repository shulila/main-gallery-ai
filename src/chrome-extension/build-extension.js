
/**
 * MainGallery.AI Chrome Extension Build Script
 * 
 * This script organizes extension files into a proper structure for loading as an unpacked extension.
 * Run with: node build-extension.js
 * For preview build: node build-extension.js --preview
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

// Step 1: Create clean output directory
console.log('Creating clean extension build directory...');
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}

// Create subdirectories
fs.mkdirSync(`${OUTPUT_DIR}/icons`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/utils`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/utils/auth`, { recursive: true });

// Step 2: Copy and modify manifest.json
console.log('Copying and configuring manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestContent);

// Update manifest based on environment
if (isPreviewBuild) {
  manifest.name = manifest.name + ' (Preview)';
  manifest.description = manifest.description + ' - PREVIEW BUILD';
}

// Ensure background is configured correctly
if (!manifest.background) {
  console.log('⚠️ Adding missing background config to manifest');
  manifest.background = {
    service_worker: "background.js",
    type: "module"
  };
} else {
  // Ensure the path is correct
  manifest.background.service_worker = "background.js";
  manifest.background.type = "module";
  console.log('✅ Updated background service worker path in manifest');
}

// Always use the correct OAuth client ID
if (manifest.oauth2 && manifest.oauth2.client_id) {
  manifest.oauth2.client_id = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
  console.log('Using correct OAuth client ID for the extension:', manifest.oauth2.client_id);
}

// Make sure web_accessible_resources include utils directory
if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
  // Update resources to include utils/auth/*.js
  const resources = manifest.web_accessible_resources[0].resources;
  
  // Add auth subdirectory resources if not already there
  if (!resources.includes("utils/auth/*.js")) {
    resources.push("utils/auth/*.js");
    console.log('Added utils/auth/*.js to web_accessible_resources');
  }
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 3: Process and copy JavaScript files
console.log('Processing and copying JavaScript files...');

function processJsFile(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ File not found: ${sourcePath}`);
    return false;
  }
  
  let content = fs.readFileSync(sourcePath, 'utf8');
  
  // Fix imports to ensure .js extensions
  content = content.replace(/from\s+['"]([^'"]+\/[^'"./]+)['"]/g, (match, p1) => {
    return `from '${p1}.js'`;
  });
  
  // Fix imports to remove .ts extensions
  content = content.replace(/from\s+['"]([^'"]+)\.ts['"]/g, (match, p1) => {
    return `from '${p1}.js'`;
  });
  
  // Fix dynamic imports
  content = content.replace(/import\s*\(\s*['"]([^'"]+)\.ts['"]\s*\)/g, (match, p1) => {
    return `import('${p1}.js')`;
  });
  
  // Write the processed file
  fs.writeFileSync(destPath, content);
  console.log(`✅ Processed: ${path.basename(destPath)}`);
  return true;
}

// Copy background.js - most critical file
processJsFile(
  path.join(SOURCE_DIR, 'background.js'),
  path.join(OUTPUT_DIR, 'background.js')
);

// Copy content.js
processJsFile(
  path.join(SOURCE_DIR, 'content.js'),
  path.join(OUTPUT_DIR, 'content.js')
);

// Copy popup.js if it exists
const popupJsPath = path.join(SOURCE_DIR, 'popup.js');
if (fs.existsSync(popupJsPath)) {
  processJsFile(popupJsPath, path.join(OUTPUT_DIR, 'popup.js'));
}

// Copy popup.html
const popupHtmlPath = path.join(SOURCE_DIR, 'popup.html');
if (fs.existsSync(popupHtmlPath)) {
  fs.copyFileSync(popupHtmlPath, path.join(OUTPUT_DIR, 'popup.html'));
  console.log('✅ Copied popup.html');
}

// Step 4: Process utility files
console.log('Processing utility files...');

// Copy util files
function processUtilsDirectory(sourceUtilsDir, destUtilsDir) {
  if (!fs.existsSync(sourceUtilsDir)) {
    console.error(`❌ Directory not found: ${sourceUtilsDir}`);
    return;
  }
  
  if (!fs.existsSync(destUtilsDir)) {
    fs.mkdirSync(destUtilsDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceUtilsDir);
  
  files.forEach(file => {
    const sourcePath = path.join(sourceUtilsDir, file);
    const stats = fs.statSync(sourcePath);
    
    // If it's a directory, process it recursively
    if (stats.isDirectory()) {
      processUtilsDirectory(
        sourcePath, 
        path.join(destUtilsDir, file)
      );
      return;
    }
    
    // Skip non-JavaScript files (including TypeScript)
    if (!file.endsWith('.js')) {
      return;
    }
    
    const destPath = path.join(destUtilsDir, file);
    processJsFile(sourcePath, destPath);
  });
}

// Process main utils directory
processUtilsDirectory(
  path.join(SOURCE_DIR, 'utils'),
  path.join(OUTPUT_DIR, 'utils')
);

// Step 5: Copy icons
console.log('Copying icons...');
if (fs.existsSync(ICONS_DIR)) {
  const iconFiles = fs.readdirSync(ICONS_DIR).filter(file => file.endsWith('.png') || file.endsWith('.svg'));
  iconFiles.forEach(file => {
    fs.copyFileSync(
      path.join(ICONS_DIR, file),
      path.join(OUTPUT_DIR, 'icons', file)
    );
  });
  console.log(`✅ Copied ${iconFiles.length} icons`);
} else {
  console.warn('⚠️ Icons directory not found');
}

// Step 6: Create environment.js with explicit settings
const environmentJs = `/**
 * Environment configuration - Generated during build
 */
export const ENVIRONMENT = "${isPreviewBuild ? 'preview' : 'production'}";
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-ai.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-ai.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-ai.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-ai.lovable.app/gallery'}";
export const OAUTH_CLIENT_ID = "648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com";
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('✅ Created environment.js with explicit settings');

// Step 7: Final validation and checks
console.log('\nPerforming final validation checks...');
const criticalFiles = ['manifest.json', 'background.js', 'popup.html'];
const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));

if (missingFiles.length > 0) {
  console.error('❌ ERROR: Missing critical files:', missingFiles.join(', '));
  process.exit(1);
} else {
  console.log('✅ All critical files are present in the build output');
}

// Check for .ts imports
console.log('\nChecking for remaining TypeScript imports...');
let foundTsImports = false;

function checkTsImports(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      checkTsImports(filePath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const tsImportRegex = /from\s+['"]([^'"]+\.ts)['"]/g;
      const matches = content.match(tsImportRegex);
      
      if (matches && matches.length > 0) {
        console.error(`❌ Found TypeScript imports in ${filePath}:`);
        matches.forEach(match => console.error(`  ${match}`));
        foundTsImports = true;
      }
    }
  });
}

checkTsImports(OUTPUT_DIR);

if (foundTsImports) {
  console.error('❌ WARNING: TypeScript imports were found in the build. This may cause issues!');
} else {
  console.log('✅ No TypeScript imports found in the build');
}

console.log(`\n✅ Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);

// Output information on how to load the extension
console.log('\nTo load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
console.log('4. If you had a previous version loaded, make sure to remove it first');
