import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Suporte a HTTPS local para testes no celular se USE_SSL=true
    ...(process.env.USE_SSL === "true" ? [basicSsl()] : []),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      devOptions: {
        enabled: true, // Força ativação no 'npm run dev' do Docker
        type: "module",
      },
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "icons/*.png",
      ],
      manifest: {
        id: "/",
        name: "ZL Gestão de Obras",
        short_name: "ZL Obras",
        description: "Sistema de Gestão de Obras de Energia Solar — ZL Engenharia",
        start_url: "/",
        display: "standalone",
        background_color: "#f8f9fa",
        theme_color: "#0f172a",
        orientation: "portrait",
        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // 5MB para evitar falhas silenciosas de cache
        navigateFallback: "/index.html", // Previne erro 404 offline no React Router
        globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
});
