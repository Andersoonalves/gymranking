/** Fila de treinos registrados sem conexão, guardada em localStorage até sincronizar. */

export type PendingWorkout = {
  group_ids: string[];
  workout_types: string[];
  workout_date: string;
  notes: string | null;
  photo_url: string | null;
  queued_at: string;
};

const KEY = "fitrank-pending-workouts";

export function readQueue(): PendingWorkout[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueueWorkout(w: Omit<PendingWorkout, "queued_at">): void {
  const queue = readQueue();
  queue.push({ ...w, queued_at: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function replaceQueue(queue: PendingWorkout[]): void {
  if (queue.length === 0) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(queue));
}

/** Erro de rede (fetch falhou) — não confundir com erro de negócio/RLS. */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|load failed/i.test(msg);
}
