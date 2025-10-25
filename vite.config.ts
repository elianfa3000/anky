import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    watch: {
      usePolling: true,
    },
    host: "0.0.0.0", // accesible desde fuera del contenedor.
    port: 5173, //puerto interno del servidor.
  },
});
