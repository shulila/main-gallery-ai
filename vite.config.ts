
import { defineConfig } from "vite";
import type { ConfigEnv, UserConfig, Plugin, PluginOption } from "vite";
import { rollup } from "rollup";
import type { RollupOptions } from "rollup"; // Import type from rollup
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Define interface for specific input configurations
interface ExtensionRollupInput {
  background: string;
  content: string;
  bridge: string;
  popup?: string;
}

interface WebAppRollupInput {
  main: string;
}

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
    ].filter(Boolean) as (Plugin | PluginOption)[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }
  };

  // Extension-specific build configuration
  if (mode === 'extension') {
    const extensionConfig: UserConfig = {
      ...baseConfig,
      build: {
        outDir: "dist-extension",
        emptyOutDir: true,
        rollupOptions: {
          input: {
            background: path.resolve(__dirname, "src/chrome-extension/background.js"),
            content: path.resolve(__dirname, "src/chrome-extension/content.js"),
            bridge: path.resolve(__dirname, "src/chrome-extension/bridge.js"),
            popup: path.resolve(__dirname, "src/chrome-extension/popup.js")
          } as Record<string, string>, // Use Record instead of ExtensionRollupInput
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "chunks/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash].[ext]",
            format: 'es', // Ensure output is ES modules
            inlineDynamicImports: false,
          },
        } as RollupOptions, // Add type assertion here
      },
      optimizeDeps: {
        // Disable optimization for extension builds to prevent import issues
        entries: [],
        disabled: mode === 'extension',
      },
    };
    
    return extensionConfig;
  } 
  
  // Default configuration for the web app
  const webAppConfig: UserConfig = {
    ...baseConfig,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        } as Record<string, string>, // Use Record instead of WebAppRollupInput
      } as RollupOptions, // Add type assertion here
    },
  };
  
  return webAppConfig;
});
