import { describe, expect, it } from "vitest";
import { clampOffset, computeCrop, coverScale, ENCODE_FORMATS, extensionForMime } from "./image-crop";

describe("image-crop", () => {
  it("cobre o quadro pelo lado menor", () => {
    expect(coverScale(1000, 500, 250)).toBe(0.5);
  });

  it("no zoom 1 recorta o quadrado central do lado menor", () => {
    const crop = computeCrop({
      naturalWidth: 1000,
      naturalHeight: 500,
      frame: 250,
      zoom: 1,
      offsetX: -125, // imagem exibida tem 500px de largura, centralizada
      offsetY: 0,
      maxSize: 1024,
    });
    expect(crop).toEqual({ sx: 250, sy: 0, sw: 500, sh: 500, outSize: 500 });
  });

  it("zoom reduz a área de origem", () => {
    const crop = computeCrop({
      naturalWidth: 800,
      naturalHeight: 800,
      frame: 200,
      zoom: 2,
      offsetX: 0,
      offsetY: 0,
      maxSize: 1024,
    });
    expect(crop.sw).toBe(400);
    expect(crop.outSize).toBe(400);
  });

  it("limita o lado máximo da saída", () => {
    const crop = computeCrop({
      naturalWidth: 4000,
      naturalHeight: 4000,
      frame: 200,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      maxSize: 1024,
    });
    expect(crop.outSize).toBe(1024);
  });

  it("nunca deixa a origem sair da imagem", () => {
    const crop = computeCrop({
      naturalWidth: 600,
      naturalHeight: 600,
      frame: 300,
      zoom: 1,
      offsetX: 9999,
      offsetY: -9999,
      maxSize: 1024,
    });
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(0);
  });

  it("clampOffset prende as bordas ao quadro", () => {
    expect(clampOffset({ x: 50, y: -400 }, 400, 400, 200)).toEqual({ x: 0, y: -200 });
  });
});

describe("extensionForMime", () => {
  it("mapeia os formatos que o app gera", () => {
    expect(extensionForMime("image/avif")).toBe("avif");
    expect(extensionForMime("image/webp")).toBe("webp");
    // jpeg vira jpg, não "jpeg"
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    // toBlob cai para PNG quando não sabe gerar o tipo pedido
    expect(extensionForMime("image/png")).toBe("png");
  });

  it("não quebra com tipo vazio", () => {
    expect(extensionForMime("")).toBe("bin");
  });

  it("AVIF é a primeira opção de codificação", () => {
    expect(ENCODE_FORMATS[0].mime).toBe("image/avif");
    expect(ENCODE_FORMATS.map((f) => f.mime)).toEqual(["image/avif", "image/webp", "image/jpeg"]);
  });
});
