import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {}, // Fix for environment variables issue
  },
  server: {
    port: 5173, // Change the port if needed
    open: true, // Opens the app in the browser automatically
  },
  resolve: {
    alias: {
      "@": "/src", // Allows using '@/components' instead of long relative paths
    },
  },
});
