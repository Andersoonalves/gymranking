import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mensagem legível de um valor capturado em catch (que é `unknown`, não `Error`).
 * O erro do Supabase (`PostgrestError`) não é instância de `Error`, é objeto com
 * `message` — sem este segundo caso as mensagens dos limites do banco (triggers
 * com RAISE EXCEPTION em português) nunca chegariam ao toast.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const { message } = err as { message?: unknown };
    if (typeof message === "string" && message) return message;
  }
  return fallback ?? String(err);
}
