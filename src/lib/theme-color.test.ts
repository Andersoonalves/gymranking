import { beforeEach, describe, expect, it } from "vitest";
import { PRIMARY_COLOR_KEY } from "./constants";
import { COLOR_PRESETS, DEFAULT_PRIMARY_COLOR, hexToHsl, luminance, syncPrimaryColor } from "./theme-color";

describe("hexToHsl", () => {
  it("converte o lima padrão para o HSL do tema escuro", () => {
    expect(hexToHsl(DEFAULT_PRIMARY_COLOR)).toEqual({ h: 75, s: 85, l: 63 });
  });

  it("zera a saturação em tons de cinza", () => {
    expect(hexToHsl("#808080")).toEqual({ h: 0, s: 0, l: 50 });
  });

  it("acerta os primários", () => {
    expect(hexToHsl("#FF0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("#00FF00")).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl("#0000FF")).toEqual({ h: 240, s: 100, l: 50 });
  });

  it("aceita hex sem cerquilha", () => {
    expect(hexToHsl("22D3EE")).toEqual(hexToHsl("#22D3EE"));
  });
});

describe("luminance", () => {
  it("vai de preto a branco", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#FFFFFF")).toBe(1);
  });

  it("separa cor clara de escura no corte de 0.6", () => {
    expect(luminance(DEFAULT_PRIMARY_COLOR)).toBeGreaterThan(0.6);
    expect(luminance("#FF4D8D")).toBeLessThan(0.6);
    expect(luminance("#4F2AB8")).toBeLessThan(0.6);
  });
});

describe("syncPrimaryColor", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--primary");
  });

  it("aplica e guarda a cor que veio do perfil", () => {
    syncPrimaryColor("#FF0000");
    expect(localStorage.getItem(PRIMARY_COLOR_KEY)).toBe("#FF0000");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("0 100% 50%");
  });

  it("ignora perfil sem cor e valor fora do formato #RRGGBB", () => {
    for (const bad of [null, undefined, "", "red", "#F00", "javascript:alert(1)"]) {
      syncPrimaryColor(bad);
    }
    expect(localStorage.getItem(PRIMARY_COLOR_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });
});

describe("COLOR_PRESETS", () => {
  it("tem 5 cores válidas e começa pelo padrão", () => {
    expect(COLOR_PRESETS).toHaveLength(5);
    expect(COLOR_PRESETS[0].hex).toBe(DEFAULT_PRIMARY_COLOR);
    for (const { hex } of COLOR_PRESETS) expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
