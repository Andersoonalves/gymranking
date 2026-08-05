import { PRIMARY_COLOR_KEY } from "@/lib/constants";

/** Lima do tema escuro — hsl(75 85% 63%), o padrão do app. */
export const DEFAULT_PRIMARY_COLOR = "#C9F150";

/** Opções prontas de cor principal. A primeira é o padrão do app. */
export const COLOR_PRESETS = [
  { name: "Lima", hex: DEFAULT_PRIMARY_COLOR },
  { name: "Laranja", hex: "#FF7A2F" },
  { name: "Ciano", hex: "#22D3EE" },
  { name: "Violeta", hex: "#A78BFA" },
  { name: "Rosa", hex: "#FF4D8D" },
] as const;

export type Hsl = { h: number; s: number; l: number };

/** `#RRGGBB` → HSL arredondado, no formato que as CSS vars do tema usam. */
export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Luminância percebida (0–1) para decidir texto claro ou escuro sobre a cor. */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/**
 * Escreve a cor principal como style inline no `<html>`. Inline vence tanto
 * `:root` quanto `.dark`, então uma escrita só serve os dois temas.
 * ponytail: mesma cor nos dois temas; se o claro pedir tom próprio, escurecer aqui.
 */
export function applyPrimaryColor(hex: string) {
  const { h, s, l } = hexToHsl(hex);
  const root = document.documentElement;
  const primary = `${h} ${s}% ${l}%`;
  const foreground = luminance(hex) > 0.6 ? "36 14% 5%" : "0 0% 100%";
  // aresta da sombra dura: mesma cor, 28% mais escura
  const edge = `${h} ${s}% ${Math.max(0, Math.round(l * 0.72))}%`;

  for (const [name, value] of [
    ["--primary", primary],
    ["--primary-foreground", foreground],
    ["--primary-edge", edge],
    ["--ring", primary],
    ["--chart-1", primary],
    ["--sidebar-primary", primary],
    ["--sidebar-primary-foreground", foreground],
    ["--sidebar-ring", primary],
  ]) {
    root.style.setProperty(name, value);
  }
}

/** Cor salva, ou o padrão do app quando o usuário nunca escolheu. */
export function loadPrimaryColor(): string {
  return localStorage.getItem(PRIMARY_COLOR_KEY) ?? DEFAULT_PRIMARY_COLOR;
}

export function savePrimaryColor(hex: string) {
  localStorage.setItem(PRIMARY_COLOR_KEY, hex);
  applyPrimaryColor(hex);
}

/** Chamado no boot: só mexe nas vars se houver escolha salva. */
export function applyStoredPrimaryColor() {
  const hex = localStorage.getItem(PRIMARY_COLOR_KEY);
  if (hex) applyPrimaryColor(hex);
}

/**
 * Cor que veio do perfil manda: dispositivo novo (ou outro navegador) pinta na
 * primeira carga. O localStorage segue como cache de boot, para não piscar o
 * lima padrão enquanto a query não resolve.
 */
export function syncPrimaryColor(hex: string | null | undefined) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
  if (hex === localStorage.getItem(PRIMARY_COLOR_KEY)) return;
  savePrimaryColor(hex);
}
