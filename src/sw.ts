/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Cache de imagem ─────────────────────────────────────────────────────────
// As fotos ficam em bucket privado e chegam por URL assinada, cujo `token` muda
// a cada assinatura. Para o cache do navegador isso é outra URL, então a mesma
// foto era baixada de novo a cada refresh. Aqui a chave é só origem + caminho:
// o token sai da conta. O objeto é imutável (o caminho tem timestamp do upload),
// então cache-first sem revalidar está correto.
const IMAGE_CACHE = "fitrank-images-v1";
const IMAGE_CACHE_MAX_ENTRIES = 200;

function isCacheableImage(url: URL): boolean {
  // Foto de treino e de progresso (Supabase Storage, URL assinada).
  if (url.pathname.includes("/storage/v1/object/sign/")) return true;
  // Avatares no CDN próprio (R2).
  return url.hostname.startsWith("cdn-") && /\.(avif|webp|jpe?g|png)$/i.test(url.pathname);
}

async function imageCacheFirst(request: Request, url: URL): Promise<Response> {
  const cacheKey = url.origin + url.pathname;
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(cacheKey, response.clone());
    // keys() vem na ordem de inserção: sobra o mais antigo para apagar.
    const keys = await cache.keys();
    for (const old of keys.slice(0, Math.max(0, keys.length - IMAGE_CACHE_MAX_ENTRIES))) {
      await cache.delete(old);
    }
  }
  return response;
}

self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!isCacheableImage(url)) return;
  event.respondWith(imageCacheFirst(event.request, url));
});

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title ?? "FitRank";
  const options: NotificationOptions = {
    body: data.body ?? "",
    data: data.data ?? { url: "/" },
    icon: "/brand/icon-192.png",
    badge: "/brand/favicon-32.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          (client as WindowClient).navigate?.(fullUrl);
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});
