import { useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { InitialAvatar } from "@/components/InitialAvatar";
import { computeStreak, filterWorkoutsByPeriod } from "@/lib/ranking";
import { computeAchievements, maxStreak } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { isSameDay, startOfDay, subDays } from "date-fns";
import { Flame, Swords } from "lucide-react";

type MemberProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { user_id: string; display_name: string; avatar_url: string | null } | null;
  /** Treinos do grupo ativo (o perfil mostra a vida do membro neste grupo). */
  workouts: { user_id: string; workout_date: string; photo_url?: string | null }[];
  myUserId: string | undefined;
};

/** Perfil do membro: números, últimas 4 semanas e conquistas — combustível de rivalidade. */
export function MemberProfileSheet({ open, onOpenChange, member, workouts, myUserId }: MemberProfileSheetProps) {
  const memberWorkouts = useMemo(
    () => workouts.filter((w) => w.user_id === member?.user_id),
    [workouts, member?.user_id],
  );

  const isMe = member?.user_id === myUserId;

  const stats = useMemo(() => {
    const dates = memberWorkouts.map((w) => w.workout_date);
    return {
      total: memberWorkouts.length,
      streak: computeStreak(dates),
      best: maxStreak(dates),
      week: filterWorkoutsByPeriod(memberWorkouts, "week").length,
      month: filterWorkoutsByPeriod(memberWorkouts, "month").length,
      photos: memberWorkouts.filter((w) => w.photo_url).length,
    };
  }, [memberWorkouts]);

  const myWeek = useMemo(
    () => filterWorkoutsByPeriod(workouts.filter((w) => w.user_id === myUserId), "week").length,
    [workouts, myUserId],
  );

  // Conquistas visíveis do membro: PRs dependem do histórico de carga (privado),
  // então só aparecem no próprio perfil — e o próprio já tem a vitrine completa.
  const achievements = useMemo(
    () => computeAchievements(memberWorkouts, 0).filter((a) => !a.id.startsWith("pr")),
    [memberWorkouts],
  );
  const unlocked = achievements.filter((a) => a.unlocked);

  // Últimas 4 semanas em pontos (28 dias, hoje no fim)
  const today = startOfDay(new Date());
  const days = Array.from({ length: 28 }, (_, i) => subDays(today, 27 - i));
  const trainedOn = (d: Date) => memberWorkouts.some((w) => isSameDay(new Date(w.workout_date), d));

  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)]"
      >
        <div className="flex flex-col gap-4 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex items-center gap-3.5">
            <InitialAvatar
              name={member.display_name}
              avatarUrl={member.avatar_url}
              isSelf={isMe}
              className="h-14 w-14 rounded-2xl text-xl"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <SheetTitle className="display-title truncate text-[22px] text-foreground">
                {isMe ? "Você" : member.display_name}
              </SheetTitle>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                {stats.total} {stats.total === 1 ? "treino" : "treinos"} neste grupo
              </span>
            </div>
            {stats.streak > 0 && (
              <span className="flex items-center gap-1 rounded-xl bg-accent/15 px-2.5 py-2 font-mono text-sm font-bold text-accent">
                <Flame className="h-4 w-4 fill-accent/20" />
                {stats.streak}
              </span>
            )}
          </div>

          {/* Números */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                [String(stats.week), "esta semana"],
                [String(stats.month), "este mês"],
                [String(stats.best), "maior sequência"],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-secondary/40 py-3.5">
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{value}</span>
                <span className="text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Comparativo da semana */}
          {!isMe && myUserId && (
            <div className="flex items-center gap-2 rounded-[11px] border border-accent/25 bg-accent/10 px-3 py-2.5">
              <Swords className="h-4 w-4 shrink-0 text-accent" />
              <span className="flex-1 text-xs font-semibold leading-snug text-accent">
                {myWeek > stats.week
                  ? `Você está na frente esta semana: ${myWeek} × ${stats.week}.`
                  : myWeek === stats.week
                    ? `Empate na semana: ${myWeek} × ${stats.week}. Próximo treino desempata.`
                    : `${member.display_name} está na frente esta semana: ${stats.week} × ${myWeek}.`}
              </span>
            </div>
          )}

          {/* Últimas 4 semanas */}
          <div className="flex flex-col gap-2">
            <span className="mono-label">Últimas 4 semanas</span>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-md",
                    trainedOn(d) ? "bg-primary" : "border border-border/60 bg-secondary/30",
                    isSameDay(d, today) && "ring-1 ring-ring",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Conquistas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="mono-label">Conquistas</span>
              <span className="font-mono text-[11px] font-bold text-primary">
                {unlocked.length}/{achievements.length}
              </span>
            </div>
            {unlocked.length === 0 ? (
              <span className="text-xs text-muted-foreground">Nenhuma ainda. Todo mundo começa do zero.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {unlocked.map((a) => (
                  <span
                    key={a.id}
                    title={a.description}
                    className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5"
                  >
                    <span className="text-base leading-none">{a.emoji}</span>
                    <span className="text-[11px] font-bold text-foreground">{a.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
