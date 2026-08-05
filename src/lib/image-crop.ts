/** Matemática do recorte de imagem. Sem DOM: o canvas fica no componente. */

/** Ordem de preferência ao codificar: o primeiro que o navegador souber gerar. */
export const ENCODE_FORMATS = [
  { mime: "image/avif", quality: 0.6 },
  { mime: "image/webp", quality: 0.82 },
  { mime: "image/jpeg", quality: 0.85 },
] as const;

/** Extensão do arquivo a partir do tipo MIME que o `toBlob` devolveu. */
export function extensionForMime(mime: string): string {
  const sub = mime.split("/")[1] ?? "";
  return sub === "jpeg" ? "jpg" : sub || "bin";
}

export type CropInput = {
  naturalWidth: number;
  naturalHeight: number;
  /** Lado do quadro quadrado de recorte, em px de tela. */
  frame: number;
  /** 1 = imagem cobrindo o quadro. */
  zoom: number;
  offsetX: number;
  offsetY: number;
  /** Lado máximo da imagem final. */
  maxSize: number;
};

export type CropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  outSize: number;
};

/** Escala que faz a imagem cobrir o quadro no zoom 1. */
export function coverScale(naturalWidth: number, naturalHeight: number, frame: number) {
  return Math.max(frame / naturalWidth, frame / naturalHeight);
}

/** Impede que o arrasto descubra as bordas do quadro. */
export function clampOffset(
  offset: { x: number; y: number },
  displayedWidth: number,
  displayedHeight: number,
  frame: number,
) {
  return {
    x: Math.min(0, Math.max(frame - displayedWidth, offset.x)),
    y: Math.min(0, Math.max(frame - displayedHeight, offset.y)),
  };
}

export function computeCrop({
  naturalWidth,
  naturalHeight,
  frame,
  zoom,
  offsetX,
  offsetY,
  maxSize,
}: CropInput): CropRect {
  const scale = coverScale(naturalWidth, naturalHeight, frame) * zoom;
  const sw = frame / scale;
  const sx = Math.max(0, Math.min(naturalWidth - sw, -offsetX / scale));
  const sy = Math.max(0, Math.min(naturalHeight - sw, -offsetY / scale));
  // Não faz upscale: nunca gera mais pixels do que a origem tem.
  const outSize = Math.round(Math.min(maxSize, sw));
  return { sx, sy, sw, sh: sw, outSize };
}
