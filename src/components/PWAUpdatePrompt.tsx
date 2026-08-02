import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xl animate-rise-in">
      <RefreshCw className="h-5 w-5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground">Nova versão disponível.</span>
      <Button size="sm" onClick={handleUpdate}>
        Recarregar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Depois
      </Button>
    </div>
  );
}
