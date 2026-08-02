import { useState } from "react";
import { useGroupWorkouts } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { filterWorkoutsByPeriod, computeRanking, buildCallout, type RankingPeriod, type RankingEntry } from "@/lib/ranking";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { useMyGroups } from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { InitialAvatar } from "@/components/InitialAvatar";
import { EmptyState } from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { cn } from "@/lib/utils";
import { Crown, Swords, Trophy } from "lucide-react";

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
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => localStorage.getItem(GROUPS_STORAGE_KEY) ?? "");
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);

  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>("all");

  const filteredByType =
    workoutTypeFilter === "all" ? workouts : workouts.filter((w) => w.workout_type.split(", ").includes(workoutTypeFilter));
  const periodWorkouts = filterWorkoutsByPeriod(filteredByType, period);
  const ranking = computeRanking(periodWorkouts, profilesMap);
  const maxCount = Math.max(1, ranking[0]?.count ?? 1);
  const callout = period === "week" ? buildCallout(ranking, userId) : null;

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
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-4 pt-4 safe-area-top">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display-title text-[28px] text-foreground">Rankings</h1>
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

      {/* Pódio */}
      {podium.length > 0 && (
        <div className="relative overflow-hidden rounded-[20px] border border-border bg-gradient-to-b from-secondary to-card px-3.5 pb-3.5 pt-5">
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
        <div className="flex flex-col gap-1.5">
          {ranking.map((entry, i) => {
            const isMe = entry.user_id === userId;
            const tied =
              (i > 0 && ranking[i - 1].count === entry.count) || (i < ranking.length - 1 && ranking[i + 1].count === entry.count);
            const isFirst = entry.position === 1;
            return (
              <div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] border p-3 transition-transform hover:translate-x-[3px]",
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
