import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

// Custom Vite plugin ensuring .glb files are excluded from the client build bundle
function excludeGlbModelsPlugin(): Plugin {
  return {
    name: "exclude-glb-models",
    // Remove any .glb assets that might have been emitted during build
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith(".glb")) {
          delete bundle[fileName];
          console.log(`[Vite Build] Stripped .glb asset from bundle: ${fileName}`);
        }
      }
    },
    // Also clean up any .glb files copied from publicDir into outDir
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      if (fs.existsSync(distDir)) {
        const removeGlbRecursive = (dir: string) => {
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
              removeGlbRecursive(fullPath);
            } else if (file.name.endsWith(".glb")) {
              try {
                fs.unlinkSync(fullPath);
                console.log(`[Vite Build] Excluded .glb model from dist: ${fullPath}`);
              } catch (err) {
                console.warn(`[Vite Build] Could not remove .glb from dist: ${fullPath}`, err);
              }
            }
          }
        };
        removeGlbRecursive(distDir);
      }
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), excludeGlbModelsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        admin: path.resolve(__dirname, "admin.html"),
        discordCallback: path.resolve(__dirname, "discord-callback.html")
      }
    }
  },
  server: {
    port: 3000,
    host: "0.0.0.0"
  }
});

