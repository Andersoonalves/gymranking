import { describe, it, expect } from "vitest";
import { spotlightBox, tooltipPosition, isBoxVisible, type Box } from "./tour-position";

const vp = { width: 400, height: 800 };
const tooltip = { width: 320, height: 200 };

describe("spotlightBox", () => {
  it("adiciona folga em volta do alvo", () => {
    expect(spotlightBox({ top: 100, left: 50, width: 60, height: 40 }, vp, 8)).toEqual({
      top: 92,
      left: 42,
      width: 76,
      height: 56,
    });
  });

  it("não vaza para fora da tela quando o alvo está na borda", () => {
    const box = spotlightBox({ top: 0, left: 0, width: 60, height: 40 }, vp, 10);
    expect(box.top).toBe(0);
    expect(box.left).toBe(0);
  });

  it("corta a largura quando o alvo termina na borda direita", () => {
    const box = spotlightBox({ top: 10, left: 380, width: 20, height: 20 }, vp, 8);
    expect(box.left + box.width).toBeLessThanOrEqual(vp.width);
  });
});

describe("tooltipPosition", () => {
  it("sem alvo, centraliza", () => {
    const p = tooltipPosition(null, tooltip, vp);
    expect(p.placement).toBe("center");
    expect(p.left).toBe(40);
    expect(p.top).toBe(300);
  });

  it("alvo no topo joga o balão para baixo", () => {
    const alvo: Box = { top: 40, left: 100, width: 100, height: 50 };
    const p = tooltipPosition(alvo, tooltip, vp, 14);
    expect(p.placement).toBe("bottom");
    expect(p.top).toBe(104);
  });

  it("alvo no rodapé joga o balão para cima", () => {
    const alvo: Box = { top: 720, left: 100, width: 100, height: 60 };
    const p = tooltipPosition(alvo, tooltip, vp, 14);
    expect(p.placement).toBe("top");
    expect(p.top).toBe(506);
  });

  it("centraliza no alvo e mantém o balão dentro da tela", () => {
    const p = tooltipPosition({ top: 100, left: 380, width: 20, height: 20 }, tooltip, vp, 14, 12);
    expect(p.left).toBe(68); // 400 - 320 - 12
    const q = tooltipPosition({ top: 100, left: 0, width: 20, height: 20 }, tooltip, vp, 14, 12);
    expect(q.left).toBe(12);
  });

  it("alvo alto e colado no topo cai para baixo mesmo sem espaço ideal", () => {
    const alvo: Box = { top: 0, left: 0, width: 400, height: 700 };
    const p = tooltipPosition(alvo, tooltip, vp, 14, 12);
    expect(p.placement).toBe("bottom");
    expect(p.top).toBeLessThanOrEqual(vp.height - tooltip.height - 12);
  });
});

describe("isBoxVisible", () => {
  it("aceita alvo inteiro na tela", () => {
    expect(isBoxVisible({ top: 100, left: 10, width: 50, height: 50 }, vp)).toBe(true);
  });

  it("recusa alvo acima, abaixo ou sem tamanho", () => {
    expect(isBoxVisible({ top: -10, left: 10, width: 50, height: 50 }, vp)).toBe(false);
    expect(isBoxVisible({ top: 780, left: 10, width: 50, height: 50 }, vp)).toBe(false);
    expect(isBoxVisible({ top: 100, left: 10, width: 0, height: 0 }, vp)).toBe(false);
  });
});
