
/**
 * Utility script to detect TypeScript imports in JavaScript files
 * Run with: node check-imports.js
 */

const fs = require('fs');
const path = require('path');

function checkImports(directory) {
  console.log(`Checking directory: ${directory}`);
  
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          checkImports(filePath);
        } else if (file.endsWith('.js')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for TypeScript imports
          const tsImportRegex = /from\s+['"]([^'"]+\.ts)['"]|import\s*\(\s*['"]([^'"]+\.ts)['"]\s*\)/g;
          const matches = content.match(tsImportRegex);
          
          if (matches && matches.length > 0) {
            console.log(`\x1b[31m❌ Found TypeScript imports in ${filePath}:\x1b[0m`);
            matches.forEach(match => console.log(`  ${match}`));
          }
          
          // Check for missing .js extensions in imports
          const noExtensionRegex = /from\s+['"]([^'"]+\/[^'"./]+)['"]|import\s*\(\s*['"]([^'"]+\/[^'"./]+)['"]\s*\)/g;
          const noExtMatches = content.match(noExtensionRegex);
          
          if (noExtMatches && noExtMatches.length > 0) {
            console.log(`\x1b[33m⚠️ Found imports without .js extension in ${filePath}:\x1b[0m`);
            noExtMatches.forEach(match => console.log(`  ${match}`));
          }
        }
      } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
  }
}

// Start checking from the chrome-extension directory
const rootDir = path.resolve(__dirname);
console.log('Starting check for TypeScript imports in JavaScript files...');
console.log(`Root directory: ${rootDir}`);
checkImports(rootDir);
console.log('Done checking imports.');
