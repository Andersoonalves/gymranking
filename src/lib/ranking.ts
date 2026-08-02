import type { ProfileInfo } from "@/hooks/useProfilesInGroup";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  isWithinInterval,
  type Locale,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type RankingPeriod = "week" | "month" | "year";

export function getPeriodBounds(period: RankingPeriod, refDate: Date = new Date()) {
  const locale: Locale = ptBR;
  switch (period) {
    case "week": {
      const start = startOfWeek(refDate, { weekStartsOn: 1, locale });
      const end = endOfWeek(refDate, { weekStartsOn: 1, locale });
      return { start, end };
    }
    case "month": {
      const start = startOfMonth(refDate);
      const end = endOfMonth(refDate);
      return { start, end };
    }
    case "year": {
      const start = startOfYear(refDate);
      const end = endOfYear(refDate);
      return { start, end };
    }
  }
}

export function filterWorkoutsByPeriod<T extends { workout_date: string }>(
  workouts: T[],
  period: RankingPeriod,
  refDate: Date = new Date()
): T[] {
  const { start, end } = getPeriodBounds(period, refDate);
  return workouts.filter((w) => {
    const d = new Date(w.workout_date);
    return isWithinInterval(d, { start, end });
  });
}

export type RankingEntry = { user_id: string; display_name: string; avatar_url: string | null; count: number; position: number };

export function computeRanking(
  workouts: { user_id: string }[],
  profilesByUserId: Record<string, ProfileInfo>
): RankingEntry[] {
  const countByUser: Record<string, number> = {};
  for (const w of workouts) {
    countByUser[w.user_id] = (countByUser[w.user_id] ?? 0) + 1;
  }
  const entries = Object.entries(countByUser)
    .map(([user_id, count]) => ({
      user_id,
      display_name: profilesByUserId[user_id]?.display_name ?? "Sem nome",
      avatar_url: profilesByUserId[user_id]?.avatar_url ?? null,
      count,
      position: 0,
    }))
    // desempate por nome: sem isso a ordem vem da iteração do objeto e muda sozinha
    .sort((a, b) => b.count - a.count || a.display_name.localeCompare(b.display_name));
  // ranking de competição: empate divide a posição e a seguinte pula (1, 1, 3)
  entries.forEach((e, i) => {
    e.position = i > 0 && entries[i - 1].count === e.count ? entries[i - 1].position : i + 1;
  });
  return entries;
}

/**
 * Dias seguidos com pelo menos um treino, terminando hoje — ou ontem, se o
 * treino de hoje ainda não aconteceu (a sequência ainda não quebrou).
 */
export function computeStreak(workoutDates: string[], refDate: Date = new Date()): number {
  const days = new Set(
    workoutDates.map((d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const cursor = new Date(refDate);
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Chamada provocativa do ranking: distância até o líder, em uma frase. */
export function buildCallout(ranking: RankingEntry[], myUserId: string | undefined): string | null {
  if (ranking.length === 0) return null;
  const leader = ranking[0];
  const me = ranking.find((e) => e.user_id === myUserId);
  if (me && me.position === 1) {
    return ranking.length > 1 && ranking[1].count === me.count
      ? "Empate na liderança. O próximo treino desempata."
      : "Você lidera a semana. Não deixe escapar.";
  }
  if (me) {
    const diff = leader.count - me.count;
    return diff === 1
      ? `Você está a 1 treino de ${leader.display_name}.`
      : `Você está a ${diff} treinos de ${leader.display_name}.`;
  }
  return `${leader.display_name} lidera com ${leader.count}. Registre o seu primeiro.`;
}

export function getMedalEmoji(position: number): string | null {
  switch (position) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return null;
  }
}
