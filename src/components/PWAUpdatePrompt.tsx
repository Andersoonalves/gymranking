import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";

const CHECK_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    import("virtual:pwa-register").then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          updateSWRef.current = updateSW;
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log("App ready to work offline");
        },
        onRegisteredSW(swUrl, registration) {
          if (!registration) return;
          intervalRef.current = setInterval(async () => {
            if (registration.installing || !navigator.onLine) return;
            try {
              const resp = await fetch(swUrl, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
              });
              if (resp?.status === 200) await registration.update();
            } catch {
              // offline ou erro de rede
            }
          }, CHECK_UPDATE_INTERVAL_MS);
        },
      });
      updateSWRef.current = updateSW;
    }).catch(() => {});

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleUpdate = () => {
    const fn = updateSWRef.current;
    if (typeof fn === "function") fn();
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg">
      <p className="text-sm font-medium">Nova versão disponível!</p>
      <p className="text-xs text-muted-foreground mt-1">Atualize para carregar as últimas mudanças.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleUpdate}>
          Atualizar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNeedRefresh(false)}>
          Depois
        </Button>
      </div>
    </div>
  );
}
