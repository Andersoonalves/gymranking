import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GripVertical, ImageOff, Pause, Play, TrendingDown, TrendingUp } from "lucide-react";

export type ComparePhoto = {
  id: string;
  url: string | null;
  kg: number;
  date: string; // já formatada para exibição
};

type PhotoCompareProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: ComparePhoto[];
};

function kgLabel(kg: number) {
  return kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function deltaLabel(from: number, to: number) {
  const d = to - from;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${sign}${Math.abs(d).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

function Photo({ photo, className }: { photo: ComparePhoto | undefined; className?: string }) {
  if (!photo?.url) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary", className)}>
        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
      </div>
    );
  }
  return <img src={photo.url} alt={`Foto de ${photo.date}`} className={cn("object-cover", className)} draggable={false} />;
}

/** Comparação de fotos de progresso: lado a lado, sobreposição com divisor e linha do tempo. */
export function PhotoCompare({ open, onOpenChange, photos }: PhotoCompareProps) {
  const [mode, setMode] = useState<"side" | "overlay" | "timeline">("side");
  const [reveal, setReveal] = useState(52);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const first = photos[0];
  const last = photos[photos.length - 1];
  const current = photos[Math.min(idx, photos.length - 1)];

  useEffect(() => {
    if (open) {
      setMode("side");
      setReveal(52);
      setIdx(photos.length - 1);
      setPlaying(false);
    }
  }, [open, photos.length]);

  useEffect(() => {
    if (!playing) {
      if (playRef.current) clearInterval(playRef.current);
      playRef.current = null;
      return;
    }
    setIdx(0);
    playRef.current = setInterval(() => {
      setIdx((i) => {
        if (i >= photos.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 620);
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, photos.length]);

  const dragReveal = (e: React.PointerEvent) => {
    const el = overlayRef.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const pct = Math.max(4, Math.min(96, ((ev.clientX - b.left) / b.width) * 100));
      setReveal(pct);
    };
    move(e);
    const onMove = (ev: PointerEvent) => move(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const scrub = (e: React.PointerEvent) => {
    const el = e.currentTarget;
    const b = el.getBoundingClientRect();
    setPlaying(false);
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const r = Math.max(0, Math.min(1, (ev.clientX - b.left) / b.width));
      setIdx(Math.round(r * (photos.length - 1)));
    };
    move(e);
    const onMove = (ev: PointerEvent) => move(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (photos.length === 0) return null;

  const totalDelta = deltaLabel(first.kg, last.kg);
  const losing = last.kg <= first.kg;
  const DeltaIcon = losing ? TrendingDown : TrendingUp;
  const idxPct = photos.length > 1 ? (idx / (photos.length - 1)) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[96dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-background p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
      >
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex flex-col gap-0.5">
            <SheetTitle className="display-title text-[21px] text-foreground">Fotos</SheetTitle>
            <span className="font-mono text-[11px] uppercase text-muted-foreground">
              {photos.length} {photos.length === 1 ? "registro" : "registros"} · {first.date} – {last.date} · {totalDelta}
            </span>
          </div>

          {/* Modos */}
          <div className="flex gap-1 rounded-[11px] border border-border/60 bg-background p-[3px]">
            {(
              [
                ["side", "Lado a lado"],
                ["overlay", "Sobrepor"],
                ["timeline", "Evolução"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex-1 rounded-lg py-[9px] text-[11px]",
                  mode === value ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "side" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[13px] border border-border">
                    <Photo photo={first} className="h-full w-full" />
                    <span className="absolute bottom-2 left-2 rounded-[7px] bg-background/80 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                      ANTES
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[15px] font-bold text-foreground">{kgLabel(first.kg)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">kg · {first.date}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[13px] border border-primary/40">
                    <Photo photo={last} className="h-full w-full" />
                    <span className="absolute bottom-2 left-2 rounded-[7px] bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">
                      DEPOIS
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[15px] font-bold text-primary">{kgLabel(last.kg)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">kg · {last.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-[11px] bg-primary/10 px-3 py-2.5">
                <DeltaIcon className="h-[17px] w-[17px] text-primary" />
                <span className="text-xs font-bold text-primary">{totalDelta} entre os registros</span>
              </div>
            </div>
          )}

          {mode === "overlay" && (
            <div className="flex flex-col gap-2.5">
              <div
                ref={overlayRef}
                onPointerDown={dragReveal}
                className="relative aspect-[4/5] cursor-ew-resize touch-none select-none overflow-hidden rounded-[15px] border border-border"
              >
                <Photo photo={last} className="absolute inset-0 h-full w-full" />
                <span className="absolute right-2.5 top-2.5 rounded-lg bg-background/80 px-2 py-1 font-mono text-[10px] font-bold text-primary">
                  {last.date} · {kgLabel(last.kg)}
                </span>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
                  <Photo photo={first} className="h-full w-full" />
                </div>
                <span className="absolute left-2.5 top-2.5 rounded-lg bg-background/80 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                  {first.date} · {kgLabel(first.kg)}
                </span>
                <div
                  className="absolute bottom-0 top-0 w-0.5 bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.7)]"
                  style={{ left: `${reveal}%` }}
                />
                <div
                  className="absolute top-1/2 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.6)]"
                  style={{ left: `${reveal}%` }}
                >
                  <GripVertical className="h-[22px] w-[22px]" />
                </div>
              </div>
              <span className="text-center text-[11px] text-muted-foreground/70">Arraste o divisor para revelar o depois.</span>
            </div>
          )}

          {mode === "timeline" && (
            <div className="flex flex-col gap-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[15px] border border-border">
                <Photo photo={current} className="h-full w-full" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-background/90 to-transparent p-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{current?.date}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[27px] font-bold text-foreground">{current ? kgLabel(current.kg) : "—"}</span>
                      <span className="font-mono text-xs font-semibold text-muted-foreground/70">kg</span>
                    </div>
                  </div>
                  {current && (
                    <span className="rounded-lg bg-primary/15 px-2 py-1 font-mono text-xs font-bold text-primary">
                      {deltaLabel(first.kg, current.kg)}
                    </span>
                  )}
                </div>
              </div>
              <div onPointerDown={scrub} className="relative cursor-pointer touch-none py-2.5">
                <div className="h-1 rounded-sm bg-secondary" />
                <div className="absolute left-0 top-2.5 h-1 rounded-sm bg-primary" style={{ width: `${idxPct}%` }} />
                <div
                  className="absolute top-0.5 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-card bg-primary shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.7)]"
                  style={{ left: `${idxPct}%` }}
                />
              </div>
              <div className="flex h-4 items-end justify-between gap-[3px]">
                {photos.map((p, i) => (
                  <span
                    key={p.id}
                    className={cn("flex-1 rounded-[1.5px]", i <= idx ? "bg-primary" : "bg-secondary")}
                    style={{ height: 6 + (i % 3) * 4 }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPlaying((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-[13px] text-[13px] font-extrabold text-primary-foreground shadow-hard-sm active-hard"
              >
                {playing ? <Pause className="h-[19px] w-[19px] fill-current" /> : <Play className="h-[19px] w-[19px] fill-current" />}
                {playing ? "Pausar" : "Ver evolução"}
              </button>
            </div>
          )}

          {/* Grade de todas as fotos */}
          <div className="flex flex-col gap-2">
            <span className="mono-label">Todas as fotos</span>
            <div className="grid grid-cols-4 gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setMode("timeline");
                    setIdx(i);
                    setPlaying(false);
                  }}
                  className="relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[11px] border border-border p-1.5 text-left hover:border-primary"
                >
                  <Photo photo={p} className="absolute inset-0 h-full w-full" />
                  <span className="relative rounded bg-background/70 px-1 py-0.5 font-mono text-[9px] font-semibold text-foreground">
                    {p.date} · {kgLabel(p.kg)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
