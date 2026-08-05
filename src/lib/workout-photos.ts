import { format, startOfDay } from "date-fns";

/** Foto de um treino já com a URL resolvida, pronta para exibir. */
export type DayPhoto = {
  /** Id do treino — serve de key e de identidade no lightbox. */
  id: string;
  url: string;
  workout_type: string;
  workout_date: string;
};

type WorkoutWithPhoto = {
  id: string;
  workout_date: string;
  workout_type: string;
  photo_url?: string | null;
};

export const MAX_STACKED_PHOTOS = 3;

/**
 * Agrupa as fotos por dia (chave `yyyy-MM-dd`), da mais recente para a mais
 * antiga, no máximo `max` por dia.
 *
 * Ordena internamente em vez de confiar na ordem que chegou: o mesmo dia pode
 * vir de fontes com ordenação diferente, e quem manda no topo da pilha é a foto
 * mais recente. Treino sem foto, ou com foto que ainda não tem URL assinada,
 * fica de fora.
 */
export function groupPhotosByDay(
  workouts: WorkoutWithPhoto[],
  urlByPath: Record<string, string>,
  max: number = MAX_STACKED_PHOTOS,
): Record<string, DayPhoto[]> {
  const byDay: Record<string, DayPhoto[]> = {};
  const withPhoto = workouts
    .filter((w) => w.photo_url && urlByPath[w.photo_url])
    .sort((a, b) => +new Date(b.workout_date) - +new Date(a.workout_date));

  for (const w of withPhoto) {
    const key = format(startOfDay(new Date(w.workout_date)), "yyyy-MM-dd");
    const list = (byDay[key] ??= []);
    if (list.length >= max) continue;
    list.push({
      id: w.id,
      url: urlByPath[w.photo_url!],
      workout_type: w.workout_type,
      workout_date: w.workout_date,
    });
  }
  return byDay;
}
