import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Propriedades fora do lib.dom: MSStream (IE Mobile) e standalone (Safari iOS).
declare global {
  interface Window { MSStream?: unknown }
  interface Navigator { standalone?: boolean }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || navigator.standalone === true;
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
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[20px] border border-border bg-gradient-to-br from-secondary to-card p-4 shadow-2xl animate-rise-in">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-primary font-mono text-[17px] font-black text-primary-foreground">
        F
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[13px] font-extrabold leading-tight text-foreground">Instale o FitRank</p>
        {showIOSHint ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Toque em{" "}
            <span className="inline-block align-middle text-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </span>{" "}
            Compartilhar → <strong>Adicionar à Tela</strong>.
          </p>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground">Adicione à sua tela inicial para acesso rápido.</p>
        )}
        {!showIOSHint && (
          <Button size="sm" className="mt-1 w-full gap-1.5" onClick={handleInstall}>
            <Download className="h-3.5 w-3.5" />
            Instalar
          </Button>
        )}
      </div>
      <button onClick={handleDismiss} aria-label="Dispensar" className="shrink-0 self-start text-muted-foreground/50 hover:text-foreground">
        <X className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
