
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const esbuild = require('esbuild');

// Configure paths
const srcDir = path.join(__dirname);
const outDir = path.join(__dirname, '..', '..', 'dist');
const contentSrcPath = path.join(srcDir, 'content.js');
const backgroundSrcPath = path.join(srcDir, 'background.js');
const popupHtmlPath = path.join(srcDir, 'popup.html');
const manifestPath = path.join(srcDir, 'manifest.json');
const iconsDir = path.join(srcDir, 'icons');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Check if background file exists
if (!fs.existsSync(backgroundSrcPath)) {
  console.error('ERROR: background.js file not found at:', backgroundSrcPath);
  process.exit(1);
}

// Copy static assets and modify paths if needed
async function copyStaticAssets() {
  console.log('Copying static assets...');
  
  // Copy icons folder
  if (fs.existsSync(iconsDir)) {
    fs.mkdirSync(path.join(outDir, 'icons'), { recursive: true });
    const iconFiles = fs.readdirSync(iconsDir);
    iconFiles.forEach(file => {
      fs.copyFileSync(
        path.join(iconsDir, file),
        path.join(outDir, 'icons', file)
      );
    });
    console.log('Copied icons folder');
  } else {
    console.warn('WARNING: Icons folder not found at:', iconsDir);
  }
  
  // Copy popup.html and modify paths if needed
  if (fs.existsSync(popupHtmlPath)) {
    let popupContent = fs.readFileSync(popupHtmlPath, 'utf8');
    // Ensure scripts have .js extension
    popupContent = popupContent.replace(/src="([^"]+)(?<!\.js)"/g, 'src="$1.js"');
    fs.writeFileSync(path.join(outDir, 'popup.html'), popupContent);
    console.log('Copied and processed popup.html');
  } else {
    console.warn('WARNING: popup.html not found at:', popupHtmlPath);
  }
  
  // Copy and validate manifest.json
  if (fs.existsSync(manifestPath)) {
    let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Ensure background script path is correct
    if (manifest.background) {
      // Make sure service_worker is properly set
      manifest.background.service_worker = 'background.js';
      
      // Always include the type: 'module' for modern extensions
      manifest.background.type = 'module';
    }
    
    // Write the updated manifest
    fs.writeFileSync(
      path.join(outDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('Copied and validated manifest.json');
  } else {
    console.error('ERROR: manifest.json not found at:', manifestPath);
    process.exit(1);
  }
  
  // Copy utils folder (needed for import references)
  const utilsDir = path.join(srcDir, 'utils');
  if (fs.existsSync(utilsDir)) {
    fs.mkdirSync(path.join(outDir, 'utils'), { recursive: true });
    const utilFiles = fs.readdirSync(utilsDir);
    
    utilFiles.forEach(file => {
      if (file.endsWith('.js')) {
        fs.copyFileSync(
          path.join(utilsDir, file),
          path.join(outDir, 'utils', file)
        );
      }
    });
    console.log('Copied utils folder');
  }
}

// Build the extension files using esbuild
async function buildExtension() {
  console.log('Building extension scripts...');
  
  try {
    // Build content script
    await esbuild.build({
      entryPoints: [contentSrcPath],
      bundle: true,
      outfile: path.join(outDir, 'content.js'),
      format: 'esm',
      target: 'es2020',
      minify: false,
      sourcemap: 'linked',
    });
    console.log('Built content script');
    
    // Build background script - most critical for the extension!
    await esbuild.build({
      entryPoints: [backgroundSrcPath],
      bundle: true,
      outfile: path.join(outDir, 'background.js'),
      format: 'esm', // Manifest V3 requires ESM format
      target: 'es2020',
      minify: false,
      sourcemap: 'linked',
    });
    console.log('Built background script');
    
    // Build bridge and other scripts
    const bridgePath = path.join(srcDir, 'bridge.js');
    if (fs.existsSync(bridgePath)) {
      await esbuild.build({
        entryPoints: [bridgePath],
        bundle: true, 
        outfile: path.join(outDir, 'bridge.js'),
        format: 'esm',
        target: 'es2020',
        minify: false,
        sourcemap: 'linked',
      });
      console.log('Built bridge script');
    }
    
    // Build popup script if it exists
    const popupScriptPath = path.join(srcDir, 'popup.js');
    if (fs.existsSync(popupScriptPath)) {
      await esbuild.build({
        entryPoints: [popupScriptPath],
        bundle: true,
        outfile: path.join(outDir, 'popup.js'),
        format: 'esm',
        target: 'es2020',
        minify: false,
        sourcemap: 'linked',
      });
      console.log('Built popup script');
    }
    
    // Add content-injection if exists
    const contentInjectionPath = path.join(srcDir, 'content-injection.js');
    if (fs.existsSync(contentInjectionPath)) {
      await esbuild.build({
        entryPoints: [contentInjectionPath],
        bundle: true,
        outfile: path.join(outDir, 'content-injection.js'),
        format: 'esm',
        target: 'es2020',
        minify: false,
        sourcemap: 'linked',
      });
      console.log('Built content-injection script');
    }
    
    console.log('All scripts built successfully');
  } catch (error) {
    console.error('Build error:', error);
    process.exit(1);
  }
}

// Validate the build to make sure all required files are present
function validateBuild() {
  console.log('Validating build...');
  
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html'
  ];
  
  const missingFiles = requiredFiles.filter(
    file => !fs.existsSync(path.join(outDir, file))
  );
  
  if (missingFiles.length > 0) {
    console.error('ERROR: Build validation failed. Missing files:', missingFiles);
    process.exit(1);
  }
  
  // Check background.js content to make sure it's not empty
  const bgContent = fs.readFileSync(path.join(outDir, 'background.js'), 'utf8');
  if (bgContent.trim().length < 10) {
    console.error('ERROR: background.js appears to be empty or invalid!');
    process.exit(1);
  }
  
  console.log('Build validation passed ✅');
}

// Main build function
async function main() {
  console.log('Starting extension build...');
  
  // Clean output directory
  if (fs.existsSync(outDir)) {
    console.log('Cleaning output directory...');
    fs.readdirSync(outDir).forEach(file => {
      const filePath = path.join(outDir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
  
  await copyStaticAssets();
  await buildExtension();
  validateBuild();
  
  console.log('Extension build completed successfully! 🎉');
  console.log('Output directory:', outDir);
}

// Run the build
main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
