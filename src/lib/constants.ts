export const GROUPS_STORAGE_KEY = "fitrank-selected-group-id";
export const NOTIFICATIONS_PREFERENCE_KEY = "fitrank-notifications-enabled";
export const PRIMARY_COLOR_KEY = "fitrank-primary-color";

/** Sidebar (desktop) pede a Progresso que abra o formulário de pesagem. */
export const NEW_WEIGHT_EVENT = "fitrank:new-weight";

/**
 * Teto do texto que o usuário digita (observação de treino e de pesagem).
 * No banco a trava é 500: o treino ao vivo grava a lista de exercícios em
 * `notes` automaticamente e passa deste limite. Ver migration
 * `20260804160000_limites_antiabuso.sql`.
 */
export const NOTES_MAX_LENGTH = 50;
