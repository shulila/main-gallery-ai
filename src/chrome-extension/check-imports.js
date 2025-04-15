
/**
 * Script to check for TypeScript imports in JavaScript files
 * Run with: node check-imports.js
 */

const fs = require('fs');
const path = require('path');

function checkImports(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory not found: ${directory}`);
    return;
  }

  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      // Recursively check subdirectories
      checkImports(filePath);
    } else if (file.endsWith('.js')) {
      // Check JavaScript files for TypeScript imports
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for imports from TypeScript files
      const tsImports = content.match(/from\s+['"].*\.ts['"]/g);
      
      if (tsImports && tsImports.length > 0) {
        console.log(`\x1b[31mTS imports found in ${filePath}:\x1b[0m`);
        tsImports.forEach(importLine => {
          console.log(`  - ${importLine}`);
        });
        console.log('');
      }
    }
  });
}

// Check the chrome-extension directory
const extensionDir = path.join(__dirname);
console.log(`Checking for TypeScript imports in: ${extensionDir}\n`);

checkImports(extensionDir);

console.log('Import check complete!');
