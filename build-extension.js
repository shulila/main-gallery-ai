
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

// Step 1: Run Vite build with 'extension' mode
console.log('Building extension with Vite...');
try {
  // Pass the environment to Vite build
  const buildCmd = isPreviewBuild ? 
    'npx vite build --mode extension --env BUILD_ENV=preview' : 
    'npx vite build --mode extension';
    
  execSync(buildCmd, { stdio: 'inherit' });
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

// Step 3: Copy and modify manifest - Special handling for preview vs production
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

// Always use the correct OAuth client ID - ensuring the right ID is used
if (manifest.oauth2 && manifest.oauth2.client_id) {
  manifest.oauth2.client_id = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com';
  console.log('Using correct OAuth client ID for the extension:', manifest.oauth2.client_id);
}

// Make sure web_accessible_resources include utils directory
if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
  // Check if utils/*.js is in resources
  const hasUtilsWildcard = manifest.web_accessible_resources[0].resources.includes("utils/*.js");
  if (!hasUtilsWildcard) {
    manifest.web_accessible_resources[0].resources.push("utils/*.js");
    console.log('Added utils/*.js to web_accessible_resources');
  }
}

// Write updated manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Step 4: Copy background.js with validation and error handling
console.log('Copying background.js (service worker)...');
const backgroundSrcPath = path.join(SOURCE_DIR, 'background.js');
const backgroundDestPath = path.join(OUTPUT_DIR, 'background.js');

if (!fs.existsSync(backgroundSrcPath)) {
  console.error('❌ CRITICAL ERROR: background.js is missing from source directory!');
  console.error(`Could not find ${backgroundSrcPath}`);
  
  // Create a minimal fallback background.js to prevent complete failure
  console.log('Creating minimal fallback background.js...');
  const fallbackContent = `// MainGallery.AI Fallback Background Script
console.log('MainGallery.AI Background Script (FALLBACK VERSION) initialized');

// This is a minimal fallback version created during build
// The original background.js was missing from the source directory
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in fallback background script:', message);
  
  // Default response for all messages
  sendResponse({ 
    success: false, 
    error: 'Using fallback background.js - original file was missing during build',
    fallback: true 
  });
  
  return true; // Keep message channel open for async response
});

// Log startup
console.log('MainGallery.AI Fallback Background Script loaded');
`;
  
  fs.writeFileSync(backgroundDestPath, fallbackContent);
  console.log('⚠️ Created fallback background.js as source file was missing');
} else {
  // Read and process background.js
  let backgroundContent = fs.readFileSync(backgroundSrcPath, 'utf8');
  
  // Fix module imports to ensure .js extensions
  backgroundContent = backgroundContent.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/${p1}.js'`;
    }
    return match;
  });
  
  // Fix dynamic imports
  backgroundContent = backgroundContent.replace(/import\(['"]\.\/utils\/([^'"]+)['"]\)/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `import('./utils/${p1}.js')`;
    }
    return match;
  });
  
  // Ensure all relative paths have .js extension
  backgroundContent = backgroundContent.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js') && !p1.includes('/')) {
      return `from '../${p1}.js'`;
    }
    return match;
  });
  
  // Write the modified background.js
  fs.writeFileSync(backgroundDestPath, backgroundContent);
  console.log('✅ Successfully copied and processed background.js');
}

// Step 5: Copy popup files with validation
console.log('Copying popup files...');
['popup.html', 'popup.css'].forEach(file => {
  try {
    const sourcePath = path.join(SOURCE_DIR, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(
        sourcePath,
        path.join(OUTPUT_DIR, file)
      );
      console.log(`✅ Copied ${file}`);
    } else {
      console.warn(`⚠️ Warning: Source file ${file} not found in ${SOURCE_DIR}`);
    }
  } catch (e) {
    console.warn(`⚠️ Warning: Could not copy ${file}: ${e.message}`);
  }
});

// Step 6: Copy and process popup.js with timeout for loading spinner
console.log('Processing popup.js...');
const popupJsPath = path.join(SOURCE_DIR, 'popup.js');
const popupJsDestPath = path.join(OUTPUT_DIR, 'popup.js');

if (!fs.existsSync(popupJsPath)) {
  console.error('❌ CRITICAL ERROR: popup.js is missing from source directory!');
} else {
  let popupJsContent = fs.readFileSync(popupJsPath, 'utf8');
  
  // Fix imports in popup.js to ensure .js extensions
  popupJsContent = popupJsContent.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/${p1}.js'`;
    }
    return match;
  });
  
  // Ensure loading timeout is implemented
  if (!popupJsContent.includes('loadingTimeout')) {
    console.log('Adding loading timeout to popup.js');
    
    // Find a good place to add the timeout - after DOMContentLoaded or near the end
    const loadingTimeoutCode = `
// Loading timeout to prevent infinite spinner - added by build script
function startLoadingTimeout() {
  if (states.loading) {
    console.log('Starting loading timeout of 10 seconds');
    window.loadingTimeout = setTimeout(() => {
      // Check if we're still in loading state
      if (states.loading && states.loading.style.display !== 'none') {
        console.log('Loading timeout reached, showing error');
        // Show error state with timeout message
        if (errorTextElement) {
          errorTextElement.textContent = 'Connection to extension service worker timed out. Please reload the extension.';
        }
        showState(states.errorView);
      }
    }, 10000); // 10 second timeout
  }
}

function clearLoadingTimeout() {
  if (window.loadingTimeout) {
    clearTimeout(window.loadingTimeout);
    window.loadingTimeout = undefined;
  }
}
`;

    // Find a good insertion point - after the function definitions section
    const insertPoint = popupJsContent.indexOf('// Check auth status immediately when popup opens');
    if (insertPoint !== -1) {
      popupJsContent = popupJsContent.slice(0, insertPoint) + loadingTimeoutCode + '\n' + popupJsContent.slice(insertPoint);
    } else {
      // If we can't find that specific comment, append to end
      popupJsContent += '\n' + loadingTimeoutCode;
    }
    
    // Now add the timeout start call in the DOMContentLoaded handler
    popupJsContent = popupJsContent.replace(
      /document\.addEventListener\('DOMContentLoaded', \(\) => \{/,
      `document.addEventListener('DOMContentLoaded', () => {
  // Start loading timeout
  startLoadingTimeout();`
    );
    
    // Add timeout clear in the auth check completion
    popupJsContent = popupJsContent.replace(
      /checkAuthAndRedirect\(\)\.then\(\(\) => \{/,
      `checkAuthAndRedirect().then(() => {
    // Clear loading timeout
    clearLoadingTimeout();`
    );
    
    console.log('✅ Added loading timeout protection to popup.js');
  }
  
  // Write the modified popup.js
  fs.writeFileSync(popupJsDestPath, popupJsContent);
  console.log('✅ Successfully processed popup.js');
}

// Step 7: Copy and process content.js
console.log('Processing content.js...');
const contentJsPath = path.join(SOURCE_DIR, 'content.js');
const contentJsDestPath = path.join(OUTPUT_DIR, 'content.js');

if (fs.existsSync(contentJsPath)) {
  let contentJsContent = fs.readFileSync(contentJsPath, 'utf8');
  
  // Fix imports to ensure .js extensions
  contentJsContent = contentJsContent.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/${p1}.js'`;
    }
    return match;
  });
  
  // Write the modified content.js
  fs.writeFileSync(contentJsDestPath, contentJsContent);
  console.log('✅ Successfully processed content.js');
} else {
  console.warn('⚠️ Warning: content.js not found in source directory');
}

// Step 8: Copy and process bridge.js if it exists
console.log('Processing bridge.js...');
const bridgeJsPath = path.join(SOURCE_DIR, 'bridge.js');
const bridgeJsDestPath = path.join(OUTPUT_DIR, 'bridge.js');

if (fs.existsSync(bridgeJsPath)) {
  let bridgeJsContent = fs.readFileSync(bridgeJsPath, 'utf8');
  
  // Fix imports to ensure .js extensions
  bridgeJsContent = bridgeJsContent.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
    if (!p1.endsWith('.js')) {
      return `from './utils/${p1}.js'`;
    }
    return match;
  });
  
  // Write the modified bridge.js
  fs.writeFileSync(bridgeJsDestPath, bridgeJsContent);
  console.log('✅ Successfully processed bridge.js');
} else {
  console.warn('⚠️ Warning: bridge.js not found in source directory');
}

// Step 9: Copy icons with validation
console.log('Copying icons...');
const requiredIcons = manifest.icons ? Object.keys(manifest.icons).map(size => `icon${size}.png`) : [];
const actionIcons = manifest.action && manifest.action.default_icon ? 
  Object.keys(manifest.action.default_icon).map(size => path.basename(manifest.action.default_icon[size])) : [];

// Combine and deduplicate icon files needed
const allIconPaths = [...new Set([...requiredIcons, ...actionIcons])];

// Check if icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  console.warn(`⚠️ Warning: Icons directory ${ICONS_DIR} not found`);
} else {
  // Check which icons exist in source
  let existingIcons = fs.readdirSync(ICONS_DIR).filter(file => file.endsWith('.png'));
  console.log(`Found ${existingIcons.length} icon files in source directory`);
  
  // Copy existing icons and report on missing ones
  allIconPaths.forEach(iconFile => {
    try {
      const sourcePath = path.join(ICONS_DIR, iconFile);
      const destPath = path.join(OUTPUT_DIR, 'icons', iconFile);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied icon: ${iconFile}`);
      } else {
        console.warn(`⚠️ Warning: Icon file not found: ${iconFile}`);
        
        // Find a substitute icon to use
        const substIcon = existingIcons[0]; // Use the first available icon as fallback
        if (substIcon) {
          console.log(`Using ${substIcon} as substitute for missing ${iconFile}`);
          fs.copyFileSync(
            path.join(ICONS_DIR, substIcon),
            destPath
          );
        }
      }
    } catch (e) {
      console.warn(`⚠️ Warning: Error handling icon ${iconFile}: ${e.message}`);
    }
  });
  
  // Copy Google icon for login button
  try {
    const googleIconSrc = path.join(ICONS_DIR, 'google-icon.svg');
    const googleIconDest = path.join(OUTPUT_DIR, 'icons', 'google-icon.svg');
    
    if (fs.existsSync(googleIconSrc)) {
      fs.copyFileSync(googleIconSrc, googleIconDest);
      console.log('✅ Copied Google icon for login button');
    } else {
      console.warn('⚠️ Warning: Google icon for login button not found');
    }
  } catch (err) {
    console.warn('Error copying Google icon:', err.message);
  }
}

// Step 10: Copy utility files with proper module extensions
console.log('Copying utility files with module structure...');
const UTILS_SOURCE = path.join(SOURCE_DIR, 'utils');
const UTILS_DEST = path.join(OUTPUT_DIR, 'utils');

if (fs.existsSync(UTILS_SOURCE)) {
  const utilFiles = fs.readdirSync(UTILS_SOURCE);
  utilFiles.forEach(file => {
    if (file.endsWith('.js')) {
      // Read the file content
      let content = fs.readFileSync(path.join(UTILS_SOURCE, file), 'utf8');
      
      // If this is the urlUtils.js file, inject the environment setting
      if (file === 'urlUtils.js') {
        // Directly replace the isPreviewEnvironment function with a hardcoded value
        const funcStart = 'export function isPreviewEnvironment() {';
        const funcEnd = '}';
        const replacementFunc = `export function isPreviewEnvironment() {
  // ENVIRONMENT VALUE - Injected during build
  return ${isPreviewBuild};
`;
        
        const startIdx = content.indexOf(funcStart);
        if (startIdx >= 0) {
          const endIdx = content.indexOf(funcEnd, startIdx);
          if (endIdx >= 0) {
            content = content.substring(0, startIdx) + replacementFunc + content.substring(endIdx);
            console.log(`Successfully injected environment value (${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'}) into urlUtils.js`);
          }
        }
      }
      
      // If this is auth.js, ensure the client ID is always the correct one
      if (file === 'auth.js') {
        // Replace the Google client ID with the correct one
        const googleClientIdRegex = /const GOOGLE_CLIENT_ID = ['"].*?['"]/;
        const correctClientId = `const GOOGLE_CLIENT_ID = '648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com'`;
        
        if (content.match(googleClientIdRegex)) {
          content = content.replace(googleClientIdRegex, correctClientId);
          console.log('Ensured correct Google Client ID in auth.js');
        }
      }
      
      // Ensure proper module imports
      content = content.replace(/from ['"]\.\/([^'"]+)['"]/g, (match, p1) => {
        // If the import doesn't end with .js, add it
        if (!p1.endsWith('.js')) {
          return `from './${p1}.js'`;
        }
        return match;
      });
      
      content = content.replace(/from ['"]\.\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
        // If the import doesn't end with .js, add it
        if (!p1.endsWith('.js')) {
          return `from '../utils/${p1}.js'`;
        }
        return match;
      });
      
      // Write the modified file
      fs.writeFileSync(path.join(UTILS_DEST, file), content);
      console.log(`✅ Copied and processed util: ${file}`);
    }
  });
} else {
  console.error('❌ CRITICAL ERROR: utils directory not found!');
}

// Step 11: Create environment.js file with explicit environment settings
const environmentJs = `// Environment configuration - Injected during build
export const ENVIRONMENT = "${isPreviewBuild ? 'preview' : 'production'}";
export const BASE_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app' : 'https://main-gallery-ai.lovable.app'}";
export const API_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/api' : 'https://main-gallery-ai.lovable.app/api'}";
export const AUTH_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/auth' : 'https://main-gallery-ai.lovable.app/auth'}";
export const GALLERY_URL = "${isPreviewBuild ? 'https://preview-main-gallery-ai.lovable.app/gallery' : 'https://main-gallery-ai.lovable.app/gallery'}";
export const OAUTH_CLIENT_ID = "648580197357-2v9sfcorca7060e4rdjr1904a4f1qa26.apps.googleusercontent.com";
`;

// Write environment file to multiple locations for reliable imports
fs.writeFileSync(path.join(OUTPUT_DIR, 'environment.js'), environmentJs);
fs.writeFileSync(path.join(OUTPUT_DIR, 'utils', 'environment.js'), environmentJs);
console.log('✅ Created environment files with explicit environment settings');

// Step 12: Modify popup HTML to add loading timeout handling
const popupHtmlPath = path.join(OUTPUT_DIR, 'popup.html');
if (fs.existsSync(popupHtmlPath)) {
  let htmlContent = fs.readFileSync(popupHtmlPath, 'utf8');
  
  // Check if we need to add loading timeout handling
  if (htmlContent.includes('id="loading"') && !htmlContent.includes('loading-timeout')) {
    // Add loading timeout handling script
    const scriptToAdd = `
    <!-- Loading timeout handler -->
    <script type="text/javascript">
      // Set timeout to prevent infinite loading spinner
      document.addEventListener('DOMContentLoaded', () => {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
          console.log('Setting up loading timeout fallback...');
          setTimeout(() => {
            if (loadingEl.style.display !== 'none') {
              // Still loading after timeout, show error
              console.error('Loading timed out after 10 seconds');
              const errorView = document.getElementById('error-view');
              const errorText = document.getElementById('error-text');
              
              if (errorView && errorText) {
                errorText.textContent = 'Extension failed to load. Please try reloading the extension or check the console for errors.';
                loadingEl.style.display = 'none';
                errorView.style.display = 'block';
              } else {
                // No error view, modify loading message
                loadingEl.innerHTML = '<div style="color:red;">Loading timed out. Please reload extension.</div>';
              }
            }
          }, 10000); // 10-second timeout
        }
      });
    </script>`;
    
    // Add script before closing body tag
    htmlContent = htmlContent.replace('</body>', `${scriptToAdd}\n</body>`);
    fs.writeFileSync(popupHtmlPath, htmlContent);
    console.log('✅ Added loading timeout handling to popup.html');
  }
}

// Step 13: Final validation and checks
console.log('\nPerforming final validation checks...');
const criticalFiles = ['manifest.json', 'background.js', 'popup.html', 'popup.js'];
const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(OUTPUT_DIR, file)));

if (missingFiles.length > 0) {
  console.error('❌ ERROR: Missing critical files:', missingFiles.join(', '));
  process.exit(1);
} else {
  console.log('✅ All critical files are present in the build output');
}

// Check if utils directory exists and has files
const utilsDir = path.join(OUTPUT_DIR, 'utils');
if (!fs.existsSync(utilsDir) || fs.readdirSync(utilsDir).length === 0) {
  console.error('❌ ERROR: Utils directory is missing or empty');
  process.exit(1);
} else {
  console.log(`✅ Utils directory contains ${fs.readdirSync(utilsDir).length} files`);
}

console.log(`\n✅ Build completed successfully for ${isPreviewBuild ? 'PREVIEW' : 'PRODUCTION'} environment!`);
console.log(`Extension files are ready in the '${OUTPUT_DIR}' directory`);

// Output a convenient command to load the extension
console.log('\nTo load the extension in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the dist-extension folder');
