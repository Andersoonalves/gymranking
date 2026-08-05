import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Achievement } from "@/lib/achievements";
import { cn } from "@/lib/utils";

type AchievementsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievements: Achievement[];
};

/** Vitrine de conquistas: destravadas em cores, bloqueadas com progresso. */
export function AchievementsSheet({ open, onOpenChange, achievements }: AchievementsSheetProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
      >
        <div className="flex flex-col gap-4 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />
          <div className="flex items-end justify-between">
            <SheetTitle className="display-title text-[22px] text-foreground">Conquistas</SheetTitle>
            <span className="font-mono text-xs font-bold text-primary">
              {unlockedCount}/{achievements.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a, i) => (
              <div
                key={a.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center animate-pop-in",
                  a.unlocked ? "border-primary/40 bg-gradient-to-b from-primary/10 to-card" : "border-border bg-secondary/40",
                )}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <span className={cn("text-[28px] leading-none", !a.unlocked && "opacity-35 grayscale")}>{a.emoji}</span>
                <span className={cn("text-[11px] font-extrabold leading-tight", a.unlocked ? "text-foreground" : "text-muted-foreground")}>
                  {a.name}
                </span>
                <span className="text-[9px] leading-snug text-muted-foreground/70">{a.description}</span>
                {a.unlocked ? (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.08em] text-primary">
                    DESTRAVADA
                  </span>
                ) : (
                  <div className="flex w-full flex-col gap-1">
                    <div className="h-1 overflow-hidden rounded-full bg-background/80">
                      <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${a.progress * 100}%` }} />
                    </div>
                    <span className="font-mono text-[8px] text-muted-foreground/60">{a.targetLabel}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
