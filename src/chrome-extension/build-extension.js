
/**
 * MainGallery.AI Chrome Extension Build Script
 * 
 * This script organizes extension files into a proper structure for loading as an unpacked extension.
 * Run with: node build-extension.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
fs.mkdirSync(`${OUTPUT_DIR}/auth`, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/api`, { recursive: true });

// Step 2: Copy and modify manifest.json
console.log('Copying and configuring manifest.json...');
const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestContent);

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

// Copy background.js
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

// Step 4: Process utility files and subdirectories
console.log('Processing utility files...');

// Process directories recursively
function processDirs(sourceDir, destDir, isRoot = false) {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`⚠️ Source directory not found: ${sourceDir}`);
    return;
  }
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      
      // Process directories recursively
      processDirs(sourcePath, destPath);
    } else if (entry.name.endsWith('.js')) {
      // Process JavaScript files
      processJsFile(sourcePath, destPath);
    } else if (isRoot && (entry.name.endsWith('.html') || entry.name.endsWith('.css'))) {
      // Copy HTML and CSS files from the root
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied: ${entry.name}`);
    }
  }
}

// Process all subdirectories
processDirs(path.join(SOURCE_DIR, 'utils'), path.join(OUTPUT_DIR, 'utils'));
processDirs(path.join(SOURCE_DIR, 'auth'), path.join(OUTPUT_DIR, 'auth'));
processDirs(path.join(SOURCE_DIR, 'api'), path.join(OUTPUT_DIR, 'api'));
processDirs(SOURCE_DIR, OUTPUT_DIR, true);

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

// Step 6: Final validation and checks
console.log('\nPerforming final validation checks...');
const criticalFiles = ['manifest.json', 'background.js'];
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

console.log(`\n✅ Build completed successfully!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);

// Output information on how to load the extension
console.log('\nTo load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
console.log('4. If you had a previous version loaded, make sure to remove it first');
