import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<(() => void) | null>(null);

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
      });
      updateSWRef.current = updateSW;
    }).catch(() => {});
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
