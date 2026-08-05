import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useAddWorkout } from "@/hooks/useWorkouts";
import { useExerciseHistory, useAddExerciseHistory } from "@/hooks/useExerciseHistory";
import { useUpdateExercise, type TrainingProgram } from "@/hooks/useTrainingPrograms";
import { isPersonalRecord } from "@/lib/personal-records";
import { extractYouTubeId, youTubeThumbnail, youTubeEmbedUrl } from "@/lib/youtube";
import { cn, errorMessage } from "@/lib/utils";
import { Check, Flag, Minus, Play, Plus, RotateCcw, SkipForward, X } from "lucide-react";
import { toast } from "sonner";

const REST_SECONDS = 90;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type LiveWorkoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: TrainingProgram | null;
};

/** Execução ao vivo: marca exercícios, cronometra o descanso e vira o registro do dia. */
export function LiveWorkoutSheet({ open, onOpenChange, program }: LiveWorkoutSheetProps) {
  const { user } = useAuth();
  const addWorkout = useAddWorkout(user?.id);
  const { data: history = [] } = useExerciseHistory(user?.id);
  const addHistory = useAddExerciseHistory(user?.id);
  const updateExercise = useUpdateExercise();

  const [done, setDone] = useState<Set<string>>(new Set());
  // Ajustes de carga feitos durante o treino (persistem no programa ao concluir)
  const [loads, setLoads] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    setDone(new Set());
    setLoads({});
    setElapsed(0);
    setRest(null);
    setPlayingId(null);
    startRef.current = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setRest((r) => (r === null ? null : r > 0 ? r - 1 : null));
    }, 1000);
    return () => clearInterval(tick);
  }, [open]);

  if (!program) return null;

  const exercises = (program.training_exercises ?? []).slice().sort((a, b) => a.position - b.position);
  const doneCount = exercises.filter((e) => done.has(e.id)).length;
  const current = exercises.find((e) => !done.has(e.id));
  const progress = exercises.length > 0 ? (doneCount / exercises.length) * 100 : 0;

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setRest(REST_SECONDS);
      }
      return next;
    });
  };

  const loadOf = (e: (typeof exercises)[number]) => loads[e.id] ?? e.load_kg ?? 0;

  const adjustLoad = (id: string, delta: number) => {
    const e = exercises.find((x) => x.id === id);
    if (!e) return;
    setLoads((prev) => {
      const current = prev[id] ?? e.load_kg ?? 0;
      return { ...prev, [id]: Math.max(0, Math.round((current + delta) * 10) / 10) };
    });
  };

  const finish = async () => {
    try {
      await addWorkout.mutateAsync({
        workout_types: [program.title],
        workout_date: new Date().toISOString(),
        notes: exercises.length > 0 ? exercises.map((e) => e.title).join(", ") : null,
      });

      // Cargas dos exercícios concluídos entram no histórico (e viram PR quando batem o recorde)
      let prs = 0;
      for (const e of exercises) {
        if (!done.has(e.id)) continue;
        const load = loadOf(e);
        if (load <= 0) continue;
        const titleHistory = history.filter((h) => h.exercise_title === e.title && h.load_kg > 0);
        const changed = titleHistory.length === 0 || load !== titleHistory[titleHistory.length - 1].load_kg;
        if (changed) {
          if (isPersonalRecord(history, e.title, load)) prs++;
          addHistory.mutate({ exercise_title: e.title, load_kg: load, reps: e.reps, sets: e.sets });
        }
        if (load !== e.load_kg) {
          updateExercise.mutate({ id: e.id, load_kg: load });
        }
      }
      if (prs > 0) {
        toast.success(`🏆 ${prs === 1 ? "Novo recorde pessoal!" : `${prs} novos recordes pessoais!`}`, {
          description: "Carga máxima batida neste treino.",
        });
      }

      toast.success("Treino registrado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível registrar o treino."));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[96dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-background p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
      >
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <SheetTitle className="display-title text-xl text-foreground">{program.title}</SheetTitle>
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground">
                EM ANDAMENTO · {doneCount} DE {exercises.length}
              </span>
            </div>
            <span className="rounded-[9px] bg-accent/15 px-3 py-[7px] font-mono text-sm font-bold tabular-nums text-accent">
              {formatClock(elapsed)}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-[3px] bg-secondary">
            <div className="h-full rounded-[3px] bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Descanso */}
          {rest !== null && rest > 0 && (
            <div className="relative flex items-center gap-4 overflow-hidden rounded-[18px] border border-border bg-gradient-to-br from-secondary to-card p-[18px]">
              <div className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(140px_80px_at_80%_50%,hsl(var(--accent)/0.2),transparent_70%)] [animation-duration:2.4s]" />
              <div className="relative flex flex-1 flex-col gap-0.5">
                <span className="mono-label text-accent">Descanso</span>
                <span className="font-mono text-[40px] font-bold leading-[0.9] tabular-nums text-foreground">{formatClock(rest)}</span>
              </div>
              <div className="relative flex gap-1.5">
                <button
                  type="button"
                  aria-label="Mais 30 segundos"
                  onClick={() => setRest((r) => (r ?? 0) + 30)}
                  className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-border bg-secondary text-secondary-foreground hover:border-accent hover:text-accent"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Pular descanso"
                  onClick={() => setRest(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-accent text-accent-foreground shadow-[0_3px_0_hsl(var(--accent)/0.5)] active:translate-y-[1px] active:shadow-[0_2px_0_hsl(var(--accent)/0.5)]"
                >
                  <SkipForward className="h-[22px] w-[22px]" />
                </button>
              </div>
            </div>
          )}

          {/* Exercício atual */}
          {current && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary bg-card p-3">
              {(() => {
                const vid = current.video_url ? extractYouTubeId(current.video_url) : null;
                if (!vid) return null;
                return playingId === current.id ? null : (
                  <button
                    type="button"
                    aria-label="Tocar vídeo do exercício"
                    onClick={() => setPlayingId(current.id)}
                    className="relative h-[50px] w-[82px] shrink-0 overflow-hidden rounded-[10px] bg-black"
                  >
                    <img src={youTubeThumbnail(vid)} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-6 w-6 fill-primary text-primary" />
                    </span>
                  </button>
                );
              })()}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="mono-label text-primary">Agora</span>
                <span className="truncate text-[15px] font-extrabold text-foreground">{current.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {current.sets}×{current.reps} REPS
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Diminuir carga"
                  onClick={() => adjustLoad(current.id, -2.5)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-secondary text-secondary-foreground"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[52px] text-center font-mono text-sm font-bold tabular-nums text-foreground">
                  {loadOf(current).toLocaleString("pt-BR")}
                  <span className="ml-0.5 text-[9px] text-muted-foreground">KG</span>
                </span>
                <button
                  type="button"
                  aria-label="Aumentar carga"
                  onClick={() => adjustLoad(current.id, 2.5)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-hard-sm active-hard"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {current?.video_url && playingId === current.id && (
            <div className="relative overflow-hidden rounded-[18px] border border-border bg-black">
              <iframe
                src={youTubeEmbedUrl(extractYouTubeId(current.video_url)!)}
                title={current.title}
                className="aspect-video w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <button
                type="button"
                aria-label="Fechar vídeo"
                onClick={() => setPlayingId(null)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-[9px] bg-black/80 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Lista */}
          <div className="flex flex-col gap-[7px]">
            {exercises.map((e) => {
              const isDone = done.has(e.id);
              const isCurrent = current?.id === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleDone(e.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[13px] border p-3 text-left",
                    isDone ? "border-border/50 bg-card/50" : isCurrent ? "border-primary/50 bg-card" : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-[1.5px]",
                      isDone ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate text-[13px] font-bold",
                        isDone ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {e.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                      {e.sets}×{e.reps} · {loadOf(e).toLocaleString("pt-BR")} KG
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={addWorkout.isPending}
              onClick={finish}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-primary p-[18px] text-[15px] font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
            >
              <span className="absolute left-0 top-0 h-full w-2/5 animate-sheen bg-gradient-to-r from-transparent via-white/50 to-transparent [animation-duration:3.4s]" />
              <Flag className="h-5 w-5" />
              {addWorkout.isPending ? "Registrando…" : "Concluir e registrar"}
            </button>
            <span className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
              Conta como 1 treino em todos os seus grupos e mantém sua sequência.
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
