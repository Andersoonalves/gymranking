import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { extractYouTubeId, youTubeThumbnail, youTubeEmbedUrl } from "@/lib/youtube";
import type { TrainingExercise } from "@/hooks/useTrainingPrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useExerciseHistory, useAddExerciseHistory } from "@/hooks/useExerciseHistory";
import { isPersonalRecord, personalRecords } from "@/lib/personal-records";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardPaste, Link2, Play, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";

type ExerciseEditorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: TrainingExercise | null;
  programTitle: string;
  onSave: (fields: { sets: number; reps: number; load_kg: number; video_url: string | null; notes: string | null }) => void;
  onDelete: () => void;
  isSaving: boolean;
};

/** Ficha do exercício: vídeo do YouTube, séries (reps · carga) e anotações de execução. */
export function ExerciseEditorSheet({
  open,
  onOpenChange,
  exercise,
  programTitle,
  onSave,
  onDelete,
  isSaving,
}: ExerciseEditorSheetProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("12");
  const [load, setLoad] = useState("0");
  const [notes, setNotes] = useState("");
  const [playing, setPlaying] = useState(false);

  const { user } = useAuth();
  const { data: history = [] } = useExerciseHistory(user?.id);
  const addHistory = useAddExerciseHistory(user?.id);

  const titleHistory = useMemo(
    () => history.filter((h) => h.exercise_title === exercise?.title && h.load_kg > 0),
    [history, exercise?.title],
  );
  const currentPR = exercise ? personalRecords(history)[exercise.title] : undefined;
  const chartData = titleHistory.map((h) => ({
    date: format(new Date(h.recorded_at), "dd/MM", { locale: ptBR }),
    carga: h.load_kg,
  }));

  useEffect(() => {
    if (!open || !exercise) return;
    setVideoUrl(exercise.video_url ?? "");
    setSets(String(exercise.sets));
    setReps(String(exercise.reps));
    setLoad(String(exercise.load_kg));
    setNotes(exercise.notes ?? "");
    setPlaying(false);
  }, [open, exercise]);

  if (!exercise) return null;

  const videoId = extractYouTubeId(videoUrl);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setVideoUrl(text.trim());
    } catch {
      // sem permissão de clipboard: o campo continua editável à mão
    }
  };

  const handleSave = () => {
    const loadKg = Math.max(0, Number(load) || 0);
    const repsN = Math.max(1, Number(reps) || 1);
    const setsN = Math.max(1, Number(sets) || 1);

    // Registra no histórico quando a carga muda (ou é a primeira) — alimenta PRs e o gráfico.
    if (exercise && loadKg > 0 && (titleHistory.length === 0 || loadKg !== titleHistory[titleHistory.length - 1].load_kg)) {
      const isPR = isPersonalRecord(history, exercise.title, loadKg);
      addHistory.mutate(
        { exercise_title: exercise.title, load_kg: loadKg, reps: repsN, sets: setsN },
        {
          onSuccess: () => {
            if (isPR) {
              toast.success(`🏆 Novo recorde: ${exercise.title}`, {
                description: `${loadKg} kg — o anterior era ${currentPR ? `${currentPR.load_kg} kg` : "nenhum"}.`,
              });
            }
          },
        },
      );
    }

    onSave({
      sets: setsN,
      reps: repsN,
      load_kg: loadKg,
      video_url: videoId ? videoUrl.trim() : null,
      notes: notes.trim() || null,
    });
  };

  const numberInput =
    "w-full rounded-[9px] border border-border bg-background px-3 py-2 text-right font-mono text-sm font-bold text-foreground outline-none focus:border-primary";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)]"
      >
        <div className="flex flex-col gap-4 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="mono-label truncate">{programTitle}</span>
              <SheetTitle className="text-xl font-black leading-tight tracking-tight text-foreground">
                {exercise.title}
              </SheetTitle>
            </div>
            <button
              type="button"
              aria-label="Remover exercício"
              onClick={onDelete}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-secondary text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Player */}
          {videoId && (
            <div className="relative overflow-hidden rounded-[18px] border border-border bg-black">
              {playing ? (
                <>
                  <iframe
                    src={youTubeEmbedUrl(videoId)}
                    title={exercise.title}
                    className="aspect-video w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    type="button"
                    aria-label="Fechar vídeo"
                    onClick={() => setPlaying(false)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-[9px] bg-black/80 text-white hover:bg-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="relative block aspect-video w-full"
                  aria-label="Tocar vídeo"
                >
                  <img src={youTubeThumbnail(videoId)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_30px_-6px_hsl(var(--primary)/0.5)] transition-transform hover:scale-105">
                      <Play className="h-8 w-8 fill-current" />
                    </span>
                  </span>
                  <span className="absolute left-3 top-3 rounded-[7px] bg-black/80 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.12em] text-primary">
                    YOUTUBE
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Link do vídeo */}
          <div className="flex flex-col gap-2">
            <span className="mono-label">Link do vídeo · YouTube</span>
            <div className="flex gap-1.5">
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-[11px] border bg-background p-3",
                  videoUrl && !videoId ? "border-destructive" : "border-border",
                )}
              >
                <Link2 className="h-[18px] w-[18px] shrink-0 text-accent" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="youtu.be/…"
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                {videoId && <CheckCircle2 className="h-[17px] w-[17px] shrink-0 text-primary" />}
              </div>
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="flex items-center gap-1.5 rounded-[11px] border border-border bg-secondary px-3.5 text-xs font-bold text-secondary-foreground hover:border-primary hover:text-primary"
              >
                <ClipboardPaste className="h-4 w-4" />
                Colar
              </button>
            </div>
            <span className="text-[11px] leading-relaxed text-muted-foreground/70">
              Cole qualquer link do YouTube — o app extrai a miniatura e toca sem sair da tela.
            </span>
          </div>

          {/* Séries */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="mono-label">Séries</span>
              <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground/60">REPS · CARGA</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] font-semibold uppercase text-muted-foreground/70">Séries</span>
                <input type="number" min="1" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} className={numberInput} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] font-semibold uppercase text-muted-foreground/70">Reps</span>
                <input type="number" min="1" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={numberInput} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] font-semibold uppercase text-muted-foreground/70">KG</span>
                <input type="number" min="0" step="0.5" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} className={numberInput} />
              </label>
            </div>
          </div>

          {/* Evolução de carga */}
          {(currentPR || chartData.length >= 2) && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="mono-label">Evolução de carga</span>
                {currentPR && (
                  <span className="flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 font-mono text-[10px] font-bold text-primary">
                    <Trophy className="h-3 w-3" />
                    PR {currentPR.load_kg} KG
                  </span>
                )}
              </div>
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -26, bottom: 0 }}>
                    <defs>
                      <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
                    />
                    <YAxis
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
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
                      formatter={(value: number) => [`${value} kg`, "Carga"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="carga"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2.5}
                      fill="url(#loadGrad)"
                      dot={{ r: 3, fill: "hsl(var(--chart-1))", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-[11px] text-muted-foreground/70">Salve uma carga nova e a linha começa a subir.</span>
              )}
            </div>
          )}

          {/* Anotações */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exercise-notes" className="mono-label">
              Anotações de execução
            </label>
            <textarea
              id="exercise-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: descer até encostar no peito, cotovelo a 45°…"
              className="resize-none rounded-[11px] border border-border bg-background p-3 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-[13px] border border-border bg-secondary p-4 text-sm font-bold text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-[2] rounded-[13px] bg-primary p-4 text-sm font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
            >
              {isSaving ? "Salvando…" : "Salvar exercício"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
