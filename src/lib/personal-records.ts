export type HistoryEntry = {
  exercise_title: string;
  load_kg: number;
  reps: number;
  recorded_at: string;
};

export type PersonalRecord = {
  exercise_title: string;
  load_kg: number;
  recorded_at: string;
};

/** Maior carga já registrada por exercício. */
export function personalRecords(history: HistoryEntry[]): Record<string, PersonalRecord> {
  const best: Record<string, PersonalRecord> = {};
  for (const h of history) {
    if (h.load_kg <= 0) continue;
    const current = best[h.exercise_title];
    if (!current || h.load_kg > current.load_kg) {
      best[h.exercise_title] = { exercise_title: h.exercise_title, load_kg: h.load_kg, recorded_at: h.recorded_at };
    }
  }
  return best;
}

/** Nova carga bate o recorde anterior deste exercício? (primeira carga > 0 já é PR) */
export function isPersonalRecord(history: HistoryEntry[], exerciseTitle: string, newLoad: number): boolean {
  if (newLoad <= 0) return false;
  const prev = history.filter((h) => h.exercise_title === exerciseTitle && h.load_kg > 0);
  if (prev.length === 0) return true;
  return newLoad > Math.max(...prev.map((h) => h.load_kg));
}

/** Quantos exercícios distintos têm recorde registrado. */
export function prCount(history: HistoryEntry[]): number {
  return Object.keys(personalRecords(history)).length;
}
