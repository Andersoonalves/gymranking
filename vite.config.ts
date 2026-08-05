import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Fallback aponta para a PRODUÇÃO (swopnxzsmymolasnqloh): um build sem env
  // nunca pode sair falando com o projeto errado.
  const supabaseUrl =
    env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://swopnxzsmymolasnqloh.supabase.co";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_jfGbuEE7ts0LXALbpmrYfQ_5He6N0aw";

  return ({
    define: {
      __APP_VERSION__: JSON.stringify(
        env.VITE_APP_VERSION || process.env.VITE_APP_VERSION || new Date().toISOString().slice(0, 16).replace("T", "/")
      ),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // O dev server não roda o Worker: /api/* vai para o de produção, do mesmo
    // jeito que o .env já aponta para o Supabase de produção.
    proxy: {
      "/api": { target: "https://fitrank.oxehub.com.br", changeOrigin: true },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      includeAssets: ["favicon.ico", "brand/**/*"],
      manifest: {
        name: "FitRank",
        short_name: "FitRank",
        description: "Treine com o grupo, registre a série e suba no ranking.",
        lang: "pt-BR",
        categories: ["health", "fitness", "sports"],
        theme_color: "#0E0D0B",
        background_color: "#0E0D0B",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        // `any` e `maskable` são arquivos separados: o maskable tem borda de sobra
        // para o recorte do Android, e o comum aproveita a área toda.
        icons: [
          {
            src: "/brand/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/brand/fitrank-mark.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "Rankings",
            short_name: "Ranking",
            url: "/rankings",
            icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Meus treinos",
            short_name: "Treinos",
            url: "/treinos",
            icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: { enabled: mode === "development" },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  });
});
