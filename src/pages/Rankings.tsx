import { useMemo, useState } from "react";
import { useGroupWorkouts } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { filterWorkoutsByPeriod, computeRanking, computeStreak, buildCallout, type RankingPeriod, type RankingEntry } from "@/lib/ranking";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMyGroups } from "@/hooks/useGroups";
import { useActiveGroupId } from "@/hooks/useActiveGroup";
import { useAuth } from "@/contexts/AuthContext";
import { InitialAvatar } from "@/components/InitialAvatar";
import { EmptyState } from "@/components/EmptyState";
import { ChallengesSection } from "@/components/ChallengesSection";
import { MemberProfileSheet } from "@/components/MemberProfileSheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { cn } from "@/lib/utils";
import { Crown, Flame, Share2, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

/** Coluna do pódio: alturas decrescentes, campeão em destaque com coroa. */
function PodiumColumn({
  entry,
  isMe,
  champion,
}: {
  entry: RankingEntry;
  isMe: boolean;
  champion: boolean;
}) {
  const height = champion ? 88 : entry.position === 2 ? 64 : 52;
  return (
    <div
      className="flex flex-1 flex-col items-center gap-2 animate-rise-in"
      style={{ animationDelay: champion ? "0s" : `${entry.position * 0.12}s` }}
    >
      {champion && <Crown className="h-5 w-5 animate-flame fill-primary/30 text-primary [animation-duration:3s]" />}
      <InitialAvatar
        name={entry.display_name}
        avatarUrl={entry.avatar_url}
        isSelf={isMe}
        className={cn(
          champion ? "h-[54px] w-[54px] rounded-2xl text-xl ring-4 ring-primary/20" : "h-[46px] w-[46px] rounded-[14px] text-[17px]",
        )}
      />
      <span className={cn("max-w-full truncate text-xs font-bold", isMe ? "text-primary" : "text-foreground", champion && "text-[13px] font-extrabold")}>
        {isMe ? "Você" : entry.display_name}
      </span>
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-0.5 rounded-t-xl",
          champion ? "bg-primary" : "border border-b-0 border-border bg-secondary",
        )}
        style={{ height }}
      >
        <span className={cn("font-mono font-bold", champion ? "text-3xl text-primary-foreground" : "text-[20px] text-muted-foreground")}>
          {entry.position}
        </span>
        <span className={cn("font-mono text-[9px] font-semibold uppercase", champion ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
          {entry.count} {entry.count === 1 ? "treino" : "treinos"}
        </span>
      </div>
    </div>
  );
}

export default function Rankings() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const [selectedGroupId, setSelectedGroupId] = useActiveGroupId();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);

  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>("all");
  const [profileMember, setProfileMember] = useState<{ user_id: string; display_name: string; avatar_url: string | null } | null>(
    null,
  );

  const filteredByType =
    workoutTypeFilter === "all" ? workouts : workouts.filter((w) => w.workout_type.split(", ").includes(workoutTypeFilter));
  const periodWorkouts = filterWorkoutsByPeriod(filteredByType, period);
  const ranking = computeRanking(periodWorkouts, profilesMap);
  const maxCount = Math.max(1, ranking[0]?.count ?? 1);
  const callout = period === "week" ? buildCallout(ranking, userId) : null;

  // Streak atual e último treino por usuário — colunas da tabela desktop
  const userStats = useMemo(() => {
    const byUser: Record<string, string[]> = {};
    for (const w of workouts) (byUser[w.user_id] ??= []).push(w.workout_date);
    const stats: Record<string, { streak: number; last: Date }> = {};
    for (const [uid, dates] of Object.entries(byUser)) {
      stats[uid] = { streak: computeStreak(dates), last: new Date(Math.max(...dates.map((d) => +new Date(d)))) };
    }
    return stats;
  }, [workouts]);

  const sharePlacar = async () => {
    if (!selectedGroup) return;
    const label = PERIODS.find((p) => p.value === period)?.label ?? "";
    const lines = ranking
      .slice(0, 5)
      .map((e) => `${e.position}º ${e.user_id === userId ? "Você" : e.display_name} — ${e.count}`);
    const text = `Placar ${selectedGroup.name} · ${label}\n${lines.join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* usuário cancelou */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Placar copiado!");
    }
  };

  // Pódio na ordem visual 2º · 1º · 3º
  const podium = ranking.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as RankingEntry[];

  if (!selectedGroup) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-5">
        <EmptyState icon={Trophy} title="Sem grupo selecionado" description="Selecione um grupo na página Início." className="w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-4 pt-4 safe-area-top lg:max-w-5xl lg:gap-5 lg:px-8 lg:pt-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display-title text-[28px] text-foreground">Rankings</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sharePlacar}
            className="hidden h-9 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary lg:flex"
          >
            <Share2 className="h-4 w-4" />
            Compartilhar placar
          </button>
          {groups.length > 1 && (
            <Select value={selectedGroup.id} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-9 w-auto shrink-0 gap-1.5 rounded-[10px] border-border bg-card text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Pódio mobile: colunas com altura */}
      {podium.length > 0 && (
        <div className="relative overflow-hidden rounded-[20px] border border-border bg-gradient-to-b from-secondary to-card px-3.5 pb-3.5 pt-5 lg:hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(180px_110px_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
          <div className="relative flex items-end justify-center gap-2.5">
            {podiumOrder.map((entry) => (
              <PodiumColumn key={entry.user_id} entry={entry} isMe={entry.user_id === userId} champion={entry.position === 1} />
            ))}
          </div>
          {callout && (
            <div className="relative mt-3.5 flex items-center gap-2 rounded-[11px] border border-accent/30 bg-accent/10 px-3 py-2.5">
              <Swords className="h-[17px] w-[17px] shrink-0 text-accent" />
              <span className="flex-1 text-xs font-semibold leading-snug text-accent">{callout}</span>
            </div>
          )}
        </div>
      )}

      {/* Pódio desktop: 3 cards, líder ao centro (como no protótipo) */}
      {podium.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-3 lg:items-end lg:gap-4">
          {[podium[1], podium[0], podium[2]].map((entry, slot) => {
            if (!entry) return <div key={`empty-${slot}`} />;
            const isMe = entry.user_id === userId;
            const champion = slot === 1;
            const tied = podium.some((p) => p !== entry && p.count === entry.count);
            return (
              <div
                key={entry.user_id}
                className={cn(
                  "relative flex flex-col items-center gap-2.5 overflow-hidden rounded-[18px] border p-5",
                  champion
                    ? "border-primary/40 bg-gradient-to-b from-secondary to-card"
                    : isMe
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-card",
                )}
              >
                {champion && (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(200px_120px_at_50%_0%,hsl(var(--primary)/0.16),transparent_70%)]" />
                    <Trophy className="relative h-6 w-6 text-primary" />
                  </>
                )}
                <InitialAvatar
                  name={entry.display_name}
                  avatarUrl={entry.avatar_url}
                  isSelf={isMe}
                  className={champion ? "h-[62px] w-[62px] rounded-[18px] text-2xl" : "h-[52px] w-[52px] rounded-[15px] text-xl"}
                />
                <span className={cn("max-w-full truncate font-extrabold", champion ? "text-lg" : "text-base", isMe ? "text-accent" : "text-foreground")}>
                  {isMe ? "Você" : entry.display_name}
                </span>
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums leading-none",
                    champion ? "text-[40px] text-primary" : "text-[30px]",
                    !champion && (isMe ? "text-accent" : "text-foreground/70"),
                  )}
                >
                  {entry.count}
                </span>
                <span
                  className={cn(
                    "relative rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em]",
                    champion ? "bg-primary/15 text-primary" : isMe ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {champion ? "LÍDER" : `${entry.position}º${tied ? " · EMPATE" : ""}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Chamada provocativa (desktop, fora do card do pódio) */}
      {callout && (
        <div className="hidden items-center gap-2 rounded-[11px] border border-accent/30 bg-accent/10 px-3 py-2.5 lg:flex">
          <Swords className="h-[17px] w-[17px] shrink-0 text-accent" />
          <span className="flex-1 text-xs font-semibold leading-snug text-accent">{callout}</span>
        </div>
      )}

      {/* Desafios */}
      <ChallengesSection groupId={selectedGroup.id} userId={userId} workouts={workouts} profilesMap={profilesMap} />

      {/* Período */}
      <div className="flex gap-[3px] rounded-xl border border-border bg-card p-[3px]">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={cn(
              "flex-1 rounded-[9px] py-2.5 text-xs",
              period === p.value ? "bg-primary font-extrabold text-primary-foreground" : "font-semibold text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtro por tipo */}
      <Select value={workoutTypeFilter} onValueChange={setWorkoutTypeFilter}>
        <SelectTrigger className="h-10 w-auto self-start rounded-[9px] border-border bg-secondary text-[11px] font-bold">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {WORKOUT_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lista completa */}
      {ranking.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum treino no período"
          description={period === "week" ? "O ranking zera toda segunda. Seja o primeiro a marcar." : "Nenhum registro neste período ainda."}
        />
      ) : (
        <>
        {/* Tabela desktop: Pos · Atleta · Treinos · Barra · Streak · Último */}
        <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
          <div className="grid grid-cols-[56px_minmax(160px,1fr)_90px_minmax(120px,220px)_80px_110px] items-center gap-4 border-b border-border bg-secondary/50 px-5 py-3">
            {["Pos", "Atleta", "Treinos", "Período", "Streak", "Último"].map((h, i) => (
              <span key={h} className={cn("mono-label", i === 5 && "text-right")}>
                {h}
              </span>
            ))}
          </div>
          {ranking.map((entry, i) => {
            const isMe = entry.user_id === userId;
            const tied =
              (i > 0 && ranking[i - 1].count === entry.count) || (i < ranking.length - 1 && ranking[i + 1].count === entry.count);
            const isFirst = entry.position === 1;
            const stats = userStats[entry.user_id];
            return (
              <button
                type="button"
                key={entry.user_id}
                onClick={() =>
                  setProfileMember({ user_id: entry.user_id, display_name: entry.display_name, avatar_url: entry.avatar_url })
                }
                className={cn(
                  "grid w-full grid-cols-[56px_minmax(160px,1fr)_90px_minmax(120px,220px)_80px_110px] items-center gap-4 border-b border-border/50 px-5 py-3.5 text-left last:border-b-0 hover:bg-secondary/40",
                  isMe && "bg-primary/5",
                )}
              >
                <span className="flex items-baseline gap-1.5">
                  <span className={cn("font-mono text-[17px] font-bold tabular-nums", isFirst ? "text-primary" : "text-muted-foreground")}>
                    {entry.position}
                  </span>
                  {tied && <span className="font-mono text-[9px] font-semibold text-muted-foreground/70">=</span>}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <InitialAvatar name={entry.display_name} avatarUrl={entry.avatar_url} isSelf={isMe} className="h-[34px] w-[34px] rounded-[10px] text-[13px]" />
                  <span className={cn("truncate text-[15px] font-bold", isMe ? "text-primary" : "text-foreground")}>
                    {isMe ? "Você" : entry.display_name}
                  </span>
                </span>
                <span className={cn("font-mono text-[17px] font-bold tabular-nums", isFirst ? "text-primary" : "text-muted-foreground")}>
                  {entry.count}
                </span>
                <span className="block h-2 overflow-hidden rounded-[4px] bg-secondary">
                  <span
                    className={cn("block h-full origin-left animate-bar-in rounded-[4px]", isFirst ? "bg-primary" : "bg-muted-foreground/40")}
                    style={{ width: `${(entry.count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame className={cn("h-4 w-4", (stats?.streak ?? 0) > 0 ? "fill-accent/20 text-accent" : "text-muted-foreground/30")} />
                  <span className="font-mono text-[13px] font-bold tabular-nums text-foreground/80">{stats?.streak ?? 0}</span>
                </span>
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {stats ? format(stats.last, "dd MMM · HH:mm", { locale: ptBR }) : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista mobile */}
        <div className="flex flex-col gap-1.5 lg:hidden">
          {ranking.map((entry, i) => {
            const isMe = entry.user_id === userId;
            const tied =
              (i > 0 && ranking[i - 1].count === entry.count) || (i < ranking.length - 1 && ranking[i + 1].count === entry.count);
            const isFirst = entry.position === 1;
            return (
              <button
                type="button"
                key={entry.user_id}
                onClick={() =>
                  setProfileMember({ user_id: entry.user_id, display_name: entry.display_name, avatar_url: entry.avatar_url })
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-transform hover:translate-x-[3px]",
                  isMe ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card",
                )}
              >
                <div className="flex min-w-[28px] flex-col items-center">
                  <span className={cn("font-mono text-[17px] font-bold", isFirst ? "text-primary" : "text-muted-foreground")}>
                    {entry.position}
                  </span>
                  {tied && <span className="font-mono text-[8px] font-semibold tracking-[0.06em] text-muted-foreground">EMP.</span>}
                </div>
                <InitialAvatar name={entry.display_name} avatarUrl={entry.avatar_url} isSelf={isMe} className="h-9 w-9 rounded-[11px] text-sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm font-extrabold", isMe ? "text-primary" : "text-foreground")}>
                      {isMe ? "Você" : entry.display_name}
                    </span>
                    <span className={cn("font-mono text-[15px] font-bold tabular-nums", isFirst ? "text-primary" : "text-muted-foreground")}>
                      {entry.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-[3px] bg-secondary">
                    <div
                      className={cn("h-full origin-left animate-bar-in rounded-[3px] [animation-duration:1s]", isFirst ? "bg-primary" : "bg-muted-foreground/40")}
                      style={{ width: `${(entry.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        </>
      )}

      <MemberProfileSheet
        open={!!profileMember}
        onOpenChange={(o) => !o && setProfileMember(null)}
        member={profileMember}
        workouts={workouts}
        myUserId={userId}
      />
    </div>
  );
}
