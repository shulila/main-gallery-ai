
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Default build configuration for the React app
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
    // Add additional configuration for extension files when mode is 'extension'
    ...(mode === 'extension' ? {
      outDir: "dist-extension",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          background: path.resolve(__dirname, "src/chrome-extension/background.js"),
          content: path.resolve(__dirname, "src/chrome-extension/content.js"),
          bridge: path.resolve(__dirname, "src/chrome-extension/bridge.js"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    } : {})
  },
}));
