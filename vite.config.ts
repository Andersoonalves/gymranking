import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Versão do app: `major.minor` vem do package.json e o patch é a contagem de
 * commits, então todo deploy sai com número novo sem ninguém precisar lembrar de
 * bumpar. Subir major/minor é decisão manual no package.json.
 *
 * `VITE_APP_VERSION` no ambiente vence tudo (build reprodutível no CI). Sem git
 * disponível (deploy a partir de tarball), o patch cai para 0.
 */
function appVersion(envVersion: string | undefined): { version: string; commit: string } {
  const git = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      return "";
    }
  };
  const commit = git("git rev-parse --short HEAD");
  if (envVersion) return { version: envVersion, commit };

  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as { version?: string };
  const [major = "0", minor = "0"] = (pkg.version ?? "0.0.0").split(".");
  const commitCount = git("git rev-list --count HEAD") || "0";
  return { version: `${major}.${minor}.${commitCount}`, commit };
}

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

  const { version, commit } = appVersion(env.VITE_APP_VERSION || process.env.VITE_APP_VERSION);

  return ({
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(commit),
      __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
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
