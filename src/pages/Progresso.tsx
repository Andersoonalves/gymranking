import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBodyProgress, useAddBodyProgress, useDeleteBodyProgress } from "@/hooks/useBodyProgress";
import { ProgressPhotoUpload } from "@/components/ProgressPhotoUpload";
import { PhotoCompare, type ComparePhoto } from "@/components/PhotoCompare";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, GitCompareArrows, ImageOff, Lock, Scale, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Range = "3m" | "6m" | "all";

function kgLabel(kg: number) {
  return kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Delta sem julgamento: sempre na cor da marca, nunca verde/vermelho. */
function deltaLabel(from: number, to: number) {
  const d = to - from;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `${sign}${Math.abs(d).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

/** Lightbox de fotos do histórico: abre na mesma tela, desliza entre as imagens. */
function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: ComparePhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];

  const prev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const next = () => onIndexChange((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-pop-in"
      role="dialog"
      aria-label="Foto de progresso ampliada"
      onClick={onClose}
      onPointerDown={(e) => {
        touchStartX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 40) prev();
        else if (dx < -40) next();
      }}
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4 safe-area-top" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-secondary text-foreground"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {photo.url ? (
          <img src={photo.url} alt={`Foto de ${photo.date}`} className="max-h-full max-w-full rounded-2xl object-contain" draggable={false} />
        ) : (
          <div className="flex h-64 w-48 items-center justify-center rounded-2xl bg-secondary">
            <ImageOff className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={prev}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={next}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-5 pb-6 pt-3 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-foreground">{kgLabel(photo.kg)}</span>
          <span className="font-mono text-xs font-semibold text-muted-foreground">kg · {photo.date}</span>
        </div>
        <div className="flex items-center gap-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Foto ${i + 1}`}
              onClick={() => onIndexChange(i)}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Progresso() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: entries = [], isLoading } = useBodyProgress(userId);
  const addEntry = useAddBodyProgress(userId);
  const deleteEntry = useDeleteBodyProgress(userId);

  const [range, setRange] = useState<Range>("6m");
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // URLs assinadas para as fotos (bucket privado)
  useEffect(() => {
    const entriesWithPhoto = entries.filter((e) => e.photo_url);
    if (entriesWithPhoto.length === 0) return;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        entriesWithPhoto.map(async (e) => {
          const { data } = await supabase.storage.from("progress-photos").createSignedUrl(e.photo_url!, 3600);
          if (data?.signedUrl) results[e.id] = data.signedUrl;
        }),
      );
      setSignedUrls((prev) => ({ ...prev, ...results }));
    })();
  }, [entries]);

  const rangedEntries = useMemo(() => {
    if (range === "all") return entries;
    const cutoff = subMonths(new Date(), range === "3m" ? 3 : 6);
    return entries.filter((e) => parseISO(e.recorded_at) >= cutoff);
  }, [entries, range]);

  const chartData = rangedEntries.map((e) => ({
    date: format(parseISO(e.recorded_at), "dd/MM", { locale: ptBR }),
    peso: e.weight_kg,
  }));
  const minWeight = rangedEntries.length ? Math.min(...rangedEntries.map((e) => e.weight_kg)) - 2 : 0;
  const maxWeight = rangedEntries.length ? Math.max(...rangedEntries.map((e) => e.weight_kg)) + 2 : 100;

  const latest = entries[entries.length - 1];
  const rangeFirst = rangedEntries[0];

  const photos: ComparePhoto[] = useMemo(
    () =>
      entries
        .filter((e) => e.photo_url)
        .map((e) => ({
          id: e.id,
          url: signedUrls[e.id] ?? null,
          kg: e.weight_kg,
          date: format(parseISO(e.recorded_at), "dd MMM", { locale: ptBR }).toUpperCase(),
        })),
    [entries, signedUrls],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput.replace(",", "."));
    if (!weight || weight <= 0) {
      toast.error("Informe um peso válido");
      return;
    }
    setSaving(true);
    try {
      await addEntry.mutateAsync({
        weight_kg: weight,
        recorded_at: new Date(dateInput + "T12:00:00").toISOString(),
        notes: notes.trim() || null,
        photo_url: photoPath,
      });
      toast.success("Registro salvo!");
      setWeightInput("");
      setNotes("");
      setPhotoPath(null);
      setDateInput(format(new Date(), "yyyy-MM-dd"));
    } catch {
      toast.error("Erro ao salvar registro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEntry.mutateAsync(deleteId);
      toast.success("Registro removido");
      setDeleteId(null);
    } catch {
      toast.error("Erro ao remover registro");
    }
  };

  const inputClass =
    "w-full rounded-[11px] border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3.5 px-5 pb-4 pt-4 safe-area-top">
      <div className="flex flex-col gap-1">
        <h1 className="display-title text-[28px] text-foreground">Progresso</h1>
        <p className="text-xs text-muted-foreground">Acompanhe sua evolução de peso e fotos. Só você vê.</p>
      </div>

      {/* Peso atual + gráfico */}
      {entries.length > 0 && (
        <div className="rounded-[18px] border border-border bg-card p-4">
          <div className="mb-3.5 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="mono-label">Peso atual</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[34px] font-bold leading-none tabular-nums text-foreground">
                  {latest ? kgLabel(latest.weight_kg) : "—"}
                </span>
                <span className="font-mono text-[13px] font-semibold text-muted-foreground">kg</span>
                {latest && rangeFirst && rangeFirst.id !== latest.id && (
                  <span className="rounded-[7px] bg-primary/15 px-2 py-1 font-mono text-[11px] font-bold text-primary">
                    {deltaLabel(rangeFirst.weight_kg, latest.weight_kg)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]">
              {(
                [
                  ["3m", "3M"],
                  ["6m", "6M"],
                  ["all", "Tudo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={cn(
                    "rounded-md px-2.5 py-[5px] text-[10px]",
                    range === value ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontFamily: "IBM Plex Mono",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number) => [`${kgLabel(value)} kg`, "Peso"]}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Mais um registro no período e a linha aparece.
            </p>
          )}
        </div>
      )}

      {/* Fotos de progresso */}
      {photos.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-extrabold text-foreground">Fotos de progresso</span>
            <span className="font-mono text-[11px] text-muted-foreground/70">{photos.length}</span>
          </div>
          <div className={cn("grid gap-1.5", photos.length > 3 ? "grid-cols-[1fr_1fr_1fr_46px]" : "grid-cols-3")}>
            {photos.slice(-3).map((p, i, arr) => {
              const isLast = i === arr.length - 1;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative flex flex-col justify-end overflow-hidden rounded-[11px] border p-1.5",
                    isLast ? "border-primary/40" : "border-border",
                  )}
                >
                  {p.url ? (
                    <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                      <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="aspect-[3/4]" />
                  <span
                    className={cn(
                      "relative self-start rounded bg-background/70 px-1 py-0.5 font-mono text-[9px] font-semibold",
                      isLast ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {p.date}
                  </span>
                </div>
              );
            })}
            {photos.length > 3 && (
              <div className="flex items-center justify-center rounded-[11px] border border-border bg-secondary">
                <span className="font-mono text-[13px] font-bold text-muted-foreground">+{photos.length - 3}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-[13px] text-[13px] font-bold text-foreground hover:border-primary hover:text-primary"
          >
            <GitCompareArrows className="h-[18px] w-[18px]" />
            Comparar fotos
          </button>
        </div>
      )}

      {/* Novo registro */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
        <span className="text-[15px] font-extrabold text-foreground">Novo registro</span>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="mono-label">Peso (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 82.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              required
              className={cn(inputClass, "font-mono font-semibold")}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="mono-label">Data</span>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
              className={cn(inputClass, "font-mono")}
            />
          </label>
        </div>
        <textarea
          placeholder="Como foi o treino? Como você está se sentindo?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={cn(inputClass, "resize-none text-xs leading-relaxed")}
        />
        {userId && (
          <ProgressPhotoUpload
            userId={userId}
            uploadedPath={photoPath}
            onUploaded={(path) => setPhotoPath(path)}
            onClear={() => setPhotoPath(null)}
          />
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-primary p-[15px] text-sm font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar registro"}
        </button>
      </form>

      {/* Histórico */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Histórico</span>
          {[...entries].reverse().map((entry, i, arr) => {
            const prev = arr[i + 1];
            const photoUrl = signedUrls[entry.id];
            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card p-3 hover:border-border">
                {entry.photo_url && (
                  <button
                    type="button"
                    aria-label="Ampliar foto de progresso"
                    onClick={() => {
                      const idx = photos.findIndex((p) => p.id === entry.id);
                      if (idx >= 0) setLightboxIdx(idx);
                    }}
                    className="h-[52px] w-[42px] shrink-0 overflow-hidden rounded-[9px] border border-border bg-secondary"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="Foto de progresso" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                      </span>
                    )}
                  </button>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[17px] font-bold text-foreground">{kgLabel(entry.weight_kg)}</span>
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">kg</span>
                    {prev && (
                      <span className="font-mono text-[11px] font-bold text-primary">{deltaLabel(prev.weight_kg, entry.weight_kg)}</span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                      {format(parseISO(entry.recorded_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {entry.notes && <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{entry.notes}</span>}
                </div>
                <button
                  type="button"
                  aria-label="Remover registro"
                  onClick={() => setDeleteId(entry.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive"
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <EmptyState
          icon={Scale}
          title="Nenhum registro ainda"
          description="Dois pesos já viram uma linha. Comece pelo de hoje."
        />
      )}

      {/* Privacidade */}
      <div className="flex items-center gap-2.5 rounded-[14px] border border-border/60 bg-card px-3.5 py-3">
        <Lock className="h-[19px] w-[19px] shrink-0 text-muted-foreground" />
        <span className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
          Seus registros e fotos são privados. Ninguém do grupo vê — nem aparecem no feed.
        </span>
      </div>

      <PhotoCompare open={compareOpen} onOpenChange={setCompareOpen} photos={photos} />

      {lightboxIdx !== null && (
        <PhotoLightbox photos={photos} index={lightboxIdx} onIndexChange={setLightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>Este registro de peso e foto será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
