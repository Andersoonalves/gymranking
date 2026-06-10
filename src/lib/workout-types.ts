import { EXERCISES_BY_MUSCLE_GROUP } from "./exercises";

/** Grupos musculares disponíveis */
export const MUSCLE_GROUPS = Object.keys(EXERCISES_BY_MUSCLE_GROUP) as readonly string[];

/** Tipos de treino pré-definidos (categorias gerais + grupos musculares) */
export const WORKOUT_TYPES = [
  ...MUSCLE_GROUPS,
  "Cardio",
  "Funcional",
  "Cross Training",
  "HIIT",
  "Mobilidade/Alongamento",
  "Full Body",
  "Treino Livre",
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];
