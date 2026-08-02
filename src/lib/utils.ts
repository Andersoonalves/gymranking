import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mensagem legível de um valor capturado em catch (que é `unknown`, não `Error`). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
