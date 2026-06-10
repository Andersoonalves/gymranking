import { useState } from "react";
import { useGroupWorkouts } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  filterWorkoutsByPeriod,
  computeRanking,
  getMedalEmoji,
  type RankingPeriod,
} from "@/lib/ranking";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { useMyGroups } from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

export default function Rankings() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    return localStorage.getItem(GROUPS_STORAGE_KEY) ?? "";
  });
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);

  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>("all");

  const filteredByType =
    workoutTypeFilter === "all"
      ? workouts
      : workouts.filter((w) => w.workout_type === workoutTypeFilter);
  const periodWorkouts = filterWorkoutsByPeriod(filteredByType, period);
  const ranking = computeRanking(periodWorkouts, profilesMap);
  const maxCount = Math.max(1, ranking[0]?.count ?? 1);

  if (!selectedGroup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Selecione um grupo na página Início.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Rankings</h1>
          <p className="text-xs text-muted-foreground truncate">{selectedGroup.name}</p>
        </div>
        {groups.length > 1 && (
          <Select value={selectedGroup.id} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-auto shrink-0">
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

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as RankingPeriod)}>
        <TabsList className="grid w-full grid-cols-3">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.value} value={p.value} className="text-xs">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Type filter */}
        <div className="mt-3">
          <Select value={workoutTypeFilter} onValueChange={setWorkoutTypeFilter}>
            <SelectTrigger className="w-full text-sm">
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
        </div>

        <div className="mt-3">
          <RankingCard ranking={ranking} maxCount={maxCount} />
        </div>
      </Tabs>
    </div>
  );
}

function RankingCard({
  ranking,
  maxCount,
}: {
  ranking: { user_id: string; display_name: string; avatar_url: string | null; count: number; position: number }[];
  maxCount: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {ranking.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Trophy className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum treino no período.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ranking.map((entry) => {
              const medal = getMedalEmoji(entry.position);
              const pct = (entry.count / maxCount) * 100;
              const isTop3 = entry.position <= 3;
              return (
                <div key={entry.user_id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 text-center text-lg ${isTop3 ? "" : "text-muted-foreground"}`}>
                      {medal ?? `#${entry.position}`}
                    </span>
                    <Avatar className={`h-9 w-9 ${isTop3 ? "ring-2 ring-primary/20" : ""}`}>
                      {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt={entry.display_name} />}
                      <AvatarFallback className="text-xs font-semibold">{entry.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isTop3 ? "font-semibold" : "font-medium"}`}>
                        {entry.display_name}
                      </p>
                      <Progress value={pct} className="h-1.5 mt-1" />
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${isTop3 ? "text-primary" : "text-muted-foreground"}`}>
                      {entry.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
