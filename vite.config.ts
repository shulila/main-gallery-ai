
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { componentTagger } from "lovable-tagger"
import type { Plugin, OutputBundle, OutputChunk } from 'rollup'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check for extension mode
  const isExtensionBuild = mode === 'extension';
  
  return {
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      // Add a plugin to copy extension files directly
      isExtensionBuild && {
        name: 'copy-extension-files',
        closeBundle() {
          const sourceDir = resolve(__dirname, 'src/chrome-extension');
          const outDir = resolve(__dirname, 'dist');
          
          // Ensure output directory exists
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          
          // Copy background.js directly (important for service worker)
          const backgroundSrc = resolve(sourceDir, 'background.js');
          const backgroundDest = resolve(outDir, 'background.js');
          
          if (fs.existsSync(backgroundSrc)) {
            // Read the file content
            let content = fs.readFileSync(backgroundSrc, 'utf8');
            
            // Fix imports to ensure .js extensions and proper paths
            content = content.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match: string, p1: string) => {
              if (!p1.endsWith('.js')) {
                return `from './utils/${p1}.js'`;
              }
              return match;
            });
            
            // Replace @/ imports with relative paths
            content = content.replace(/from ['"]@\/([^'"]+)['"]/g, (match: string, p1: string) => {
              return `from './${p1}.js'`;
            });
            
            // Replace dynamic imports too
            content = content.replace(/import\(['"]@\/([^'"]+)['"]\)/g, (match: string, p1: string) => {
              return `import('./${p1}.js')`;
            });
            
            // Fix relative imports without extensions
            content = content.replace(/from ['"]\.\.\/([^'"\.]+)['"]/g, (match: string, p1: string) => {
              return `from '../${p1}.js'`;
            });
            
            // Specifically handle supabase client import - CRITICAL FIX
            content = content.replace(/from ['"]@\/integrations\/supabase\/client['"]/g, 
              `from './utils/supabaseClient.js'`);
            
            // Add diagnostic log
            if (!content.includes('[MainGallery] background.js is alive')) {
              content = `console.log("[MainGallery] background.js is alive");\n${content}`;
            }
            
            // Write the modified content
            fs.writeFileSync(backgroundDest, content);
            console.log('✅ Copied and processed background.js');
          } else {
            console.error('❌ CRITICAL ERROR: background.js not found!');
          }
          
          // Copy utils directory
          const utilsSrc = resolve(sourceDir, 'utils');
          const utilsDest = resolve(outDir, 'utils');
          
          if (fs.existsSync(utilsSrc)) {
            if (!fs.existsSync(utilsDest)) {
              fs.mkdirSync(utilsDest, { recursive: true });
            }
            
            // Copy utils files
            const files = fs.readdirSync(utilsSrc);
            files.forEach(file => {
              if (file.endsWith('.js')) {
                const srcPath = resolve(utilsSrc, file);
                const destPath = resolve(utilsDest, file);
                
                let content = fs.readFileSync(srcPath, 'utf8');
                
                // Fix imports within utils
                content = content.replace(/from ['"]\.\/([^'"]+)['"]/g, (match: string, p1: string) => {
                  if (!p1.endsWith('.js')) {
                    return `from './${p1}.js'`;
                  }
                  return match;
                });
                
                // Handle any @/ imports that might be in utils
                content = content.replace(/from ['"]@\/([^'"]+)['"]/g, (match: string, p1: string) => {
                  return `from '../../${p1}.js'`;
                });
                
                // Specifically handle supabase client import
                content = content.replace(/from ['"]@\/integrations\/supabase\/client['"]/g, 
                  `from '../../integrations/supabase/client.js'`);
                
                fs.writeFileSync(destPath, content);
                console.log(`✅ Copied and processed utils/${file}`);
              }
            });
          } else {
            console.error('❌ ERROR: utils directory not found!');
          }
          
          // Copy manifest.json
          const manifestSrc = resolve(sourceDir, 'manifest.json');
          const manifestDest = resolve(outDir, 'manifest.json');
          
          if (fs.existsSync(manifestSrc)) {
            let manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf8'));
            
            // Ensure background script is properly configured
            if (manifest.background) {
              manifest.background.service_worker = 'background.js';
              manifest.background.type = 'module';
            }
            
            fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
            console.log('✅ Copied and processed manifest.json');
          } else {
            console.error('❌ ERROR: manifest.json not found!');
          }
          
          // Copy icons
          const iconsSrc = resolve(sourceDir, 'icons');
          const iconsDest = resolve(outDir, 'icons');
          
          if (fs.existsSync(iconsSrc)) {
            if (!fs.existsSync(iconsDest)) {
              fs.mkdirSync(iconsDest, { recursive: true });
            }
            
            // Copy icon files
            const files = fs.readdirSync(iconsSrc);
            files.forEach(file => {
              if (file.endsWith('.png') || file.endsWith('.svg')) {
                fs.copyFileSync(
                  resolve(iconsSrc, file),
                  resolve(iconsDest, file)
                );
                console.log(`✅ Copied icon: ${file}`);
              }
            });
          }
          
          // Copy popup files
          ['popup.html', 'popup.js', 'popup.css'].forEach(file => {
            const srcPath = resolve(sourceDir, file);
            const destPath = resolve(outDir, file);
            
            if (fs.existsSync(srcPath)) {
              if (file.endsWith('.js')) {
                // Process JS files
                let content = fs.readFileSync(srcPath, 'utf8');
                
                // Fix imports
                content = content.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
                  if (!p1.endsWith('.js')) {
                    return `from './utils/${p1}.js'`;
                  }
                  return match;
                });
                
                // Replace @/ imports
                content = content.replace(/from ['"]@\/([^'"]+)['"]/g, (match, p1) => {
                  return `from '../${p1}.js'`;
                });
                
                fs.writeFileSync(destPath, content);
              } else {
                // Copy other files directly
                fs.copyFileSync(srcPath, destPath);
              }
              console.log(`✅ Copied ${file}`);
            }
          });
          
          // Copy bridge.js if it exists
          const bridgeSrc = resolve(sourceDir, 'bridge.js');
          const bridgeDest = resolve(outDir, 'bridge.js');
          
          if (fs.existsSync(bridgeSrc)) {
            let content = fs.readFileSync(bridgeSrc, 'utf8');
            
            // Fix imports
            content = content.replace(/from ['"]\.\/utils\/([^'"]+)['"]/g, (match, p1) => {
              if (!p1.endsWith('.js')) {
                return `from './utils/${p1}.js'`;
              }
              return match;
            });
            
            fs.writeFileSync(bridgeDest, content);
            console.log('✅ Copied and processed bridge.js');
          }
          
          console.log('✅ Extension files copy completed');
        }
      } as Plugin
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      host: "::",
      port: 8080
    },
    build: {
      // Special build configuration for Chrome extension
      ...(isExtensionBuild ? {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            content: resolve(__dirname, 'src/chrome-extension/content.js'),
            background: resolve(__dirname, 'src/chrome-extension/background.js'),
            popup: resolve(__dirname, 'src/chrome-extension/popup.js'),
            bridge: resolve(__dirname, 'src/chrome-extension/bridge.js'),
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name].[hash].js',
            assetFileNames: 'assets/[name].[ext]',
            format: 'esm', // Important: Use ESM format for Chrome extensions
          },
        },
        // Add this to convert @/ imports to relative paths
        plugins: [
          {
            name: 'convert-alias-paths',
            generateBundle(_: unknown, bundle: OutputBundle): void {
              // Process each chunk to replace @/ with relative paths
              Object.keys(bundle).forEach(key => {
                const chunk = bundle[key] as OutputChunk;
                if (chunk.type === 'chunk') {
                  let code = chunk.code;
                  // Replace @/ imports with relative paths
                  code = code.replace(/from ['"]@\/(.*?)['"]/g, (match: string, p1: string) => {
                    return `from '../${p1}'`;
                  });
                  // Replace dynamic imports too
                  code = code.replace(/import\(['"]@\/(.*?)['"]\)/g, (match: string, p1: string) => {
                    return `import('../${p1}')`;
                  });
                  chunk.code = code;
                }
              });
            }
          } as Plugin
        ]
      } : {}),
    },
  }
})
