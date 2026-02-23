import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone === true;
}

const DISMISSED_KEY = "pwa-install-dismissed";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    // Re-show after 7 days
    return Date.now() - Number(val) < 7 * 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt
    if (isIOS() && !isStandalone()) {
      setShowIOSHint(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setShowIOSHint(false);
  };

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg">
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Instalar FitRank</p>
          {showIOSHint ? (
            <p className="text-xs text-muted-foreground mt-1">
              Toque em{" "}
              <span className="inline-block align-middle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </span>{" "}
              Compartilhar e depois em <strong>"Adicionar à Tela de Início"</strong>.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione à sua tela inicial para acesso rápido.
              </p>
              <Button size="sm" className="mt-2 w-full" onClick={handleInstall}>
                Instalar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
