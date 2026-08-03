import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clampOffset, computeCrop, coverScale } from "@/lib/image-crop";

const FRAME = 260;
const MAX_ZOOM = 4;

type Props = {
  file: File | null;
  /** Lado máximo da imagem gerada. */
  maxSize?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

/** Recorte quadrado com zoom e arrastar. */
export function ImageCropDialog({ file, maxSize = 1024, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const scale = natural ? coverScale(natural.w, natural.h, FRAME) * zoom : 1;
  const displayed = natural ? { w: natural.w * scale, h: natural.h * scale } : { w: 0, h: 0 };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setNatural({ w, h });
    const s = coverScale(w, h, FRAME);
    setOffset({ x: (FRAME - w * s) / 2, y: (FRAME - h * s) / 2 });
  };

  const changeZoom = (next: number) => {
    if (!natural) return;
    const base = coverScale(natural.w, natural.h, FRAME);
    const center = FRAME / 2;
    // Mantém o centro do quadro fixo ao aproximar.
    const ratio = next / zoom;
    const moved = { x: center - (center - offset.x) * ratio, y: center - (center - offset.y) * ratio };
    setZoom(next);
    setOffset(clampOffset(moved, natural.w * base * next, natural.h * base * next, FRAME));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = { x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y };
    setOffset(clampOffset(next, displayed.w, displayed.h, FRAME));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!file || !natural || !imgRef.current) return;
    setWorking(true);
    const { sx, sy, sw, sh, outSize } = computeCrop({
      naturalWidth: natural.w,
      naturalHeight: natural.h,
      frame: FRAME,
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
      maxSize,
    });

    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    canvas.getContext("2d")?.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outSize, outSize);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    setWorking(false);
    if (!blob) return;

    const name = file.name.replace(/\.[^.]+$/, "");
    onConfirm(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-xl border border-border bg-muted touch-none"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {url && (
              <img
                ref={imgRef}
                src={url}
                alt="Foto para recortar"
                draggable={false}
                onLoad={handleLoad}
                className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
                style={{
                  width: displayed.w || undefined,
                  height: displayed.h || undefined,
                  left: offset.x,
                  top: offset.y,
                  visibility: natural ? "visible" : "hidden",
                }}
              />
            )}
          </div>

          {/* ponytail: zoom só por slider; pinça de dois dedos se alguém pedir. */}
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
          <p className="text-xs text-muted-foreground">Arraste para posicionar e use a barra para o zoom.</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={working}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!natural || working}>
            {working ? "Processando…" : "Usar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
