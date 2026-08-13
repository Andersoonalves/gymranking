/** Geometria do tour com spotlight: onde abrir o furo e onde encaixar o balão. */

export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Viewport = { width: number; height: number };

/** Balão abaixo do alvo, acima dele, ou centralizado quando não há alvo na tela. */
export type Placement = "bottom" | "top" | "center";

export type TooltipPlacement = { top: number; left: number; placement: Placement };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Furo do spotlight: o alvo com uma folga em volta, sem vazar da viewport. */
export function spotlightBox(target: Box, vp: Viewport, padding = 8): Box {
  const top = Math.max(0, target.top - padding);
  const left = Math.max(0, target.left - padding);
  return {
    top,
    left,
    width: Math.min(target.width + padding * 2, vp.width - left),
    height: Math.min(target.height + padding * 2, vp.height - top),
  };
}

/**
 * Encaixa o balão perto do alvo: embaixo quando há espaço, senão em cima. Sem
 * alvo (elemento não existe nesta tela, ex.: barra do mobile no desktop) o balão
 * vai para o centro e o chamador não desenha furo nenhum.
 */
export function tooltipPosition(
  target: Box | null,
  tooltip: Size,
  vp: Viewport,
  gap = 14,
  margin = 12,
): TooltipPlacement {
  if (!target) {
    return {
      top: Math.max(margin, (vp.height - tooltip.height) / 2),
      left: Math.max(margin, (vp.width - tooltip.width) / 2),
      placement: "center",
    };
  }

  const below = target.top + target.height + gap;
  const above = target.top - gap - tooltip.height;
  const cabeEmbaixo = below + tooltip.height + margin <= vp.height;
  // Quando não cabe nem embaixo nem em cima, fica embaixo e o clamp resolve —
  // sobrepor um pedaço do alvo é melhor que sair da tela.
  const placement: Placement = cabeEmbaixo || above < margin ? "bottom" : "top";

  const centroDoAlvo = target.left + target.width / 2 - tooltip.width / 2;
  return {
    top: clamp(placement === "bottom" ? below : above, margin, Math.max(margin, vp.height - tooltip.height - margin)),
    left: clamp(centroDoAlvo, margin, Math.max(margin, vp.width - tooltip.width - margin)),
    placement,
  };
}

/** Alvo fora da área visível precisa de scroll antes de medir. */
export function isBoxVisible(target: Box, vp: Viewport): boolean {
  return target.top >= 0 && target.top + target.height <= vp.height && target.width > 0 && target.height > 0;
}
