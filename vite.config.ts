
import { defineConfig } from "vite";
import type { ConfigEnv, UserConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig((configEnv: ConfigEnv): UserConfig => {
  const { mode } = configEnv;
  
  // Base configuration shared between both modes
  const baseConfig: UserConfig = {
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
      outDir: "dist",
      emptyOutDir: true,
    }
  };

  // Extension-specific build configuration
  if (mode === 'extension') {
    return {
      ...baseConfig,
      build: {
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
      },
    };
  } 
  
  // Default configuration for the web app
  return {
    ...baseConfig,
    build: {
      ...baseConfig.build,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
      },
    },
  };
});
