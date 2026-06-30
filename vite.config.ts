/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri espera un puerto fijo e ignora src-tauri/ para el HMR.
export default defineConfig({
  // ponytail: React Compiler diferido. plugin-react@6 (rolldown/oxc) cambió la API
  // del compiler (reactCompilerPreset) y aún no está estable/documentada. No
  // optimiza nada con 0 componentes. Wirearlo cuando haya UI real con bench que lo pida.
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
