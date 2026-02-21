/** Tipos de treino pré-definidos (Fase 3 - plano) */
export const WORKOUT_TYPES = [
  "Peito",
  "Costas",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Abdômen",
  "Cardio",
  "Funcional",
  "Cross Training",
  "HIIT",
  "Mobilidade/Alongamento",
  "Full Body",
  "Treino Livre",
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];
