/**
 * Conquistas computadas do histórico — nada é gravado no banco.
 * Recebem os treinos do próprio usuário (todos os grupos contam iguais,
 * então qualquer grupo serve) e o histórico de cargas.
 */

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  unlocked: boolean;
  /** Progresso até destravar (para as bloqueadas). */
  progress: number;
  targetLabel: string;
};

type WorkoutLike = { workout_date: string; photo_url?: string | null };

/** Maior sequência de dias consecutivos com treino no histórico. */
export function maxStreak(workoutDates: string[]): number {
  const days = [
    ...new Set(
      workoutDates.map((d) => {
        const dt = new Date(d);
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
      }),
    ),
  ].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = NaN;
  for (const day of days) {
    run = day - prev === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function computeAchievements(myWorkouts: WorkoutLike[], prTotal: number): Achievement[] {
  const total = myWorkouts.length;
  const streak = maxStreak(myWorkouts.map((w) => w.workout_date));
  const photos = myWorkouts.filter((w) => w.photo_url).length;
  const hours = myWorkouts.map((w) => new Date(w.workout_date).getHours());
  const earlyBird = hours.filter((h) => h < 7).length;
  const nightOwl = hours.filter((h) => h >= 22).length;
  const weekend = myWorkouts.filter((w) => {
    const d = new Date(w.workout_date).getDay();
    return d === 0 || d === 6;
  }).length;

  const counting = (current: number, target: number) => ({
    unlocked: current >= target,
    progress: Math.min(1, current / target),
    targetLabel: `${Math.min(current, target)}/${target}`,
  });

  return [
    { id: "first", emoji: "🎬", name: "Primeira vez", description: "Registre seu primeiro treino.", ...counting(total, 1) },
    { id: "ten", emoji: "📈", name: "Pegando ritmo", description: "10 treinos registrados.", ...counting(total, 10) },
    { id: "fifty", emoji: "💪", name: "Cinquentão", description: "50 treinos registrados.", ...counting(total, 50) },
    { id: "hundred", emoji: "🏛️", name: "Centenário", description: "100 treinos registrados.", ...counting(total, 100) },
    { id: "streak7", emoji: "🔥", name: "Semana perfeita", description: "7 dias seguidos treinando.", ...counting(streak, 7) },
    { id: "streak30", emoji: "🌋", name: "Imparável", description: "30 dias seguidos treinando.", ...counting(streak, 30) },
    { id: "pr1", emoji: "🏆", name: "Primeiro recorde", description: "Bata sua primeira carga máxima.", ...counting(prTotal, 1) },
    { id: "pr10", emoji: "👑", name: "Recordista", description: "Recorde pessoal em 10 exercícios.", ...counting(prTotal, 10) },
    { id: "early", emoji: "🌅", name: "Madrugador", description: "5 treinos antes das 7h.", ...counting(earlyBird, 5) },
    { id: "owl", emoji: "🦉", name: "Coruja", description: "5 treinos depois das 22h.", ...counting(nightOwl, 5) },
    { id: "weekend", emoji: "🏖️", name: "Sem folga", description: "10 treinos em fins de semana.", ...counting(weekend, 10) },
    { id: "proof", emoji: "📸", name: "Prova viva", description: "5 treinos com foto de prova.", ...counting(photos, 5) },
  ];
}
