
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check for extension mode
  const isExtensionBuild = mode === 'extension';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      // Special build configuration for Chrome extension
      ...(isExtensionBuild ? {
        outDir: 'dist-extension',
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
      } : {}),
    },
  }
})
