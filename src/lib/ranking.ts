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
    .sort((a, b) => b.count - a.count);
  entries.forEach((e, i) => {
    e.position = i + 1;
  });
  return entries;
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
