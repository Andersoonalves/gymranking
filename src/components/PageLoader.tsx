const blocks = [
  { h: 88, r: 16 },
  { h: 56, r: 12 },
  { h: 220, r: 18 },
  { h: 180, r: 18 },
  { h: 48, r: 12 },
  { h: 72, r: 14 },
];

/** Carregamento de tela cheia: skeleton com varredura, no lugar do spinner. */
export function PageLoader() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background safe-area-top">
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <span className="display-title text-2xl text-foreground">
          Fit<span className="text-primary">rank</span>
        </span>
        <div className="relative h-10 w-10 overflow-hidden rounded-[10px] bg-secondary">
          <span className="absolute inset-y-0 left-0 w-3/5 animate-sheen bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="relative overflow-hidden border border-border/50 bg-card"
            style={{ height: b.h, borderRadius: b.r }}
          >
            <span
              className="absolute inset-y-0 left-0 w-[45%] animate-sheen bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-1 items-end justify-center gap-2 pb-10 pt-6">
        <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary [animation-duration:1.2s]" />
        <span className="mono-label">Carregando</span>
      </div>
    </div>
  );
}
