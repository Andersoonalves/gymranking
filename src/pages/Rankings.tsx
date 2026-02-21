import { useState } from "react";
import { useGroupWorkouts } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { Progress } from "@/components/ui/progress";

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

export default function Rankings() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const selectedGroupId = typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null;
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
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
        Selecione um grupo na página Início.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
        <p className="text-sm text-muted-foreground">{selectedGroup.name}</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as RankingPeriod)}>
        <TabsList className="grid w-full grid-cols-3">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 flex gap-2">
          <Select value={workoutTypeFilter} onValueChange={setWorkoutTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de treino" />
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

        <TabsContent value="week" className="mt-4">
          <RankingCard ranking={ranking} maxCount={maxCount} />
        </TabsContent>
        <TabsContent value="month" className="mt-4">
          <RankingCard ranking={ranking} maxCount={maxCount} />
        </TabsContent>
        <TabsContent value="year" className="mt-4">
          <RankingCard ranking={ranking} maxCount={maxCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RankingCard({
  ranking,
  maxCount,
}: {
  ranking: { user_id: string; display_name: string; count: number; position: number }[];
  maxCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posição</CardTitle>
        <CardDescription>Quantidade de treinos no período</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum treino no período.</p>
        ) : (
          ranking.map((entry) => {
            const medal = getMedalEmoji(entry.position);
            const pct = (entry.count / maxCount) * 100;
            return (
              <div key={entry.user_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg w-7">{medal ?? `#${entry.position}`}</span>
                    <span className="font-medium">{entry.display_name}</span>
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">{entry.count} treinos</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
