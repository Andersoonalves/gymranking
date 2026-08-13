import { addDays, format, parseISO } from "date-fns";

/** Dia conta como cumprido a partir de 80% das refeições previstas. */
export const DIET_ADHERENCE_GOAL = 0.8;

/** Item da refeição: o que comer e quanto. `qty` é texto livre ("150 g", "2 un"). */
export type DietItem = { name: string; qty: string | null };

/**
 * Itens vêm como JSONB do banco. Valida a forma no cliente em vez de confiar:
 * uma linha antiga ou escrita por fora não pode derrubar a tela.
 */
export function toItems(value: unknown): DietItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const { name, qty } = raw as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") return [];
    return [{ name, qty: typeof qty === "string" && qty.trim() !== "" ? qty : null }];
  });
}

export type DietMeal = {
  id: string;
  name: string;
  time_of_day: string | null;
  items: DietItem[];
  /** 0 = domingo .. 6 = sábado. null = todo dia. */
  day_of_week: number | null;
  position: number;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  effective_from: string;
  archived_at: string | null;
};

export type DietMealLog = { meal_id: string; log_date: string };

export type Adherence = { done: number; total: number; ratio: number };

/** Data local em 'YYYY-MM-DD' — o formato que o Postgres usa em colunas date. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Refeições vigentes no dia: janela effective_from..archived_at (fim exclusivo,
 * então arquivar hoje já tira a refeição de hoje) e dia da semana.
 */
export function mealsForDate(meals: DietMeal[], date: string): DietMeal[] {
  const dow = parseISO(date).getDay();
  return meals
    .filter(
      (m) =>
        m.effective_from <= date &&
        (m.archived_at === null || m.archived_at > date) &&
        (m.day_of_week === null || m.day_of_week === dow),
    )
    .sort(
      (a, b) =>
        // Sem horário vai para o fim: quem tem hora marcada manda na ordem.
        (a.time_of_day === null ? 1 : 0) - (b.time_of_day === null ? 1 : 0) ||
        (a.time_of_day ?? "").localeCompare(b.time_of_day ?? "") ||
        a.position - b.position ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}

export function adherenceForDate(meals: DietMeal[], logs: DietMealLog[], date: string): Adherence {
  const planned = mealsForDate(meals, date);
  const doneIds = new Set(logs.filter((l) => l.log_date === date).map((l) => l.meal_id));
  const done = planned.filter((m) => doneIds.has(m.id)).length;
  const total = planned.length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

/** Dia bom = tinha refeição prevista e cumpriu a meta. */
export function isGoodDay(a: Adherence): boolean {
  return a.total > 0 && a.ratio >= DIET_ADHERENCE_GOAL;
}

/**
 * Dias bons consecutivos até hoje. Hoje só conta se já bateu a meta, mas não
 * quebra a sequência quando ainda não bateu — o dia não terminou. Dia sem
 * refeição prevista é neutro: pula sem zerar.
 */
export function adherenceStreak(meals: DietMeal[], logs: DietMealLog[], today: string): number {
  let streak = 0;
  let cursor = parseISO(today);
  for (let i = 0; i < 366; i++) {
    const key = toDateKey(cursor);
    const a = adherenceForDate(meals, logs, key);
    if (isGoodDay(a)) {
      streak++;
    } else if (a.total > 0 && key !== today) {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Dias bons dentro do intervalo (inclusivo), ignorando dias sem plano e dias que
 * ainda não aconteceram — sem o corte em `today`, a semana começaria valendo
 * "1/7" na segunda-feira, como se os outros seis dias já tivessem sido perdidos.
 */
export function rangeAdherence(
  meals: DietMeal[],
  logs: DietMealLog[],
  from: string,
  to: string,
  today: string,
): { days: number; goodDays: number; ratio: number } {
  const last = to < today ? to : today;
  let days = 0;
  let goodDays = 0;
  for (let cursor = parseISO(from); toDateKey(cursor) <= last; cursor = addDays(cursor, 1)) {
    const a = adherenceForDate(meals, logs, toDateKey(cursor));
    if (a.total === 0) continue;
    days++;
    if (isGoodDay(a)) goodDays++;
  }
  return { days, goodDays, ratio: days === 0 ? 0 : goodDays / days };
}

export type DayMacros = {
  /** false quando alguma refeição do dia está sem macro: aí o total mentiria. */
  complete: boolean;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function macrosForDate(meals: DietMeal[], date: string): DayMacros {
  const planned = mealsForDate(meals, date);
  const sum = (pick: (m: DietMeal) => number | null) => planned.reduce((acc, m) => acc + (pick(m) ?? 0), 0);
  return {
    complete: planned.length > 0 && planned.every((m) => m.kcal !== null),
    kcal: sum((m) => m.kcal),
    protein_g: sum((m) => m.protein_g),
    carbs_g: sum((m) => m.carbs_g),
    fat_g: sum((m) => m.fat_g),
  };
}
