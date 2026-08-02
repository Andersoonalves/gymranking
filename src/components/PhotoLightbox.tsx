import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

export type LightboxPhoto = {
  id: string;
  url: string | null;
  /** Texto principal da legenda (ex.: "82,5" ou nome do autor). */
  title: string;
  /** Complemento da legenda (ex.: "kg · 23 FEV" ou tipo do treino). */
  subtitle?: string;
};

/** Lightbox de fotos: abre na mesma tela, desliza entre as imagens. */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];

  const prev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const next = () => onIndexChange((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-pop-in"
      role="dialog"
      aria-label="Foto ampliada"
      onClick={onClose}
      onPointerDown={(e) => {
        touchStartX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 40) prev();
        else if (dx < -40) next();
      }}
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4 safe-area-top" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-secondary text-foreground"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {photo.url ? (
          <img src={photo.url} alt={photo.title} className="max-h-full max-w-full rounded-2xl object-contain" draggable={false} />
        ) : (
          <div className="flex h-64 w-48 items-center justify-center rounded-2xl bg-secondary">
            <ImageOff className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={prev}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={next}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-5 pb-6 pt-3 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-foreground">{photo.title}</span>
          {photo.subtitle && <span className="font-mono text-xs font-semibold text-muted-foreground">{photo.subtitle}</span>}
        </div>
        <div className="flex items-center gap-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Foto ${i + 1}`}
              onClick={() => onIndexChange(i)}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
