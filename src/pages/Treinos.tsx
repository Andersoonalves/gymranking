import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTrainingPrograms,
  useCreateProgram,
  useDeleteProgram,
  useAddExercise,
  useDeleteExercise,
  useUpdateExercise,
  type TrainingProgram,
  type TrainingExercise,
} from "@/hooks/useTrainingPrograms";
import { useImportTemplate } from "@/hooks/useImportTemplate";
import { WORKOUT_TEMPLATES, type WorkoutTemplate } from "@/lib/workout-templates";
import { EXERCISES_BY_MUSCLE_GROUP } from "@/lib/exercises";
import { MUSCLE_GROUPS } from "@/lib/workout-types";
import { extractYouTubeId } from "@/lib/youtube";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { ExerciseEditorSheet } from "@/components/ExerciseEditorSheet";
import { LiveWorkoutSheet } from "@/components/LiveWorkoutSheet";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader } from "@/components/PageLoader";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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
import { cn, errorMessage } from "@/lib/utils";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListChecks,
  Play,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type Filter = "all" | "video" | "templates";

export default function Treinos() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: programs = [], isLoading } = useTrainingPrograms(userId);
  const createProgram = useCreateProgram();
  const deleteProgram = useDeleteProgram();
  const addExercise = useAddExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const importTemplate = useImportTemplate();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; count: number } | null>(null);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [pickerFor, setPickerFor] = useState<TrainingProgram | null>(null);
  const [editing, setEditing] = useState<{ exercise: TrainingExercise; program: TrainingProgram } | null>(null);
  const [liveProgram, setLiveProgram] = useState<TrainingProgram | null>(null);

  const myPrograms = useMemo(() => programs.filter((p) => p.user_id === userId), [programs, userId]);
  const [libGroup, setLibGroup] = useState<string>(MUSCLE_GROUPS[0]);

  const visiblePrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myPrograms.filter((p) => {
      const exercises = p.training_exercises ?? [];
      if (filter === "video" && !exercises.some((e) => e.video_url)) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || exercises.some((e) => e.title.toLowerCase().includes(q));
    });
  }, [myPrograms, search, filter]);

  const handleCreateProgram = async () => {
    if (!newTitle.trim() || !userId) return;
    try {
      const created = await createProgram.mutateAsync({ user_id: userId, title: newTitle.trim() });
      setNewTitle("");
      setCreating(false);
      setExpandedId(created.id);
      toast.success("Treino criado!");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao criar treino"));
    }
  };

  const handleDeleteProgram = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProgram.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
      toast.success("Treino excluído.");
    } catch {
      toast.error("Erro ao excluir treino");
    }
  };

  const handlePickExercise = async (name: string) => {
    if (!pickerFor) return;
    try {
      await addExercise.mutateAsync({
        program_id: pickerFor.id,
        title: name,
        sets: 3,
        reps: 12,
        load_kg: 0,
        position: pickerFor.training_exercises?.length ?? 0,
      });
      toast.success(`${name} adicionado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao adicionar exercício"));
    }
  };

  // ── Desktop: ficha selecionada, volume por grupo e biblioteca lateral ──────
  const muscleOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [g, list] of Object.entries(EXERCISES_BY_MUSCLE_GROUP)) for (const ex of list) m[ex.pt] = g;
    return m;
  }, []);

  // Séries somadas por grupo muscular, em todas as fichas (top 6)
  const volumeByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of myPrograms) {
      for (const e of p.training_exercises ?? []) {
        const g = muscleOf[e.title] ?? "Outros";
        counts[g] = (counts[g] ?? 0) + e.sets;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [myPrograms, muscleOf]);
  const volumeMax = Math.max(1, volumeByGroup[0]?.[1] ?? 1);

  // Ficha aberta no editor desktop (compartilha o expandedId do acordeão mobile)
  const selectedProgram = visiblePrograms.find((p) => p.id === expandedId) ?? visiblePrograms[0];
  const selectedExercises = (selectedProgram?.training_exercises ?? []).slice().sort((a, b) => a.position - b.position);
  const totalLoad = selectedExercises.reduce((acc, e) => acc + e.sets * e.reps * e.load_kg, 0);
  const totalSets = selectedExercises.reduce((acc, e) => acc + e.sets, 0);

  const addToSelected = async (name: string) => {
    if (!selectedProgram) return;
    try {
      await addExercise.mutateAsync({
        program_id: selectedProgram.id,
        title: name,
        sets: 3,
        reps: 12,
        load_kg: 0,
        position: selectedExercises.length,
      });
      toast.success(`${name} adicionado em ${selectedProgram.title}.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao adicionar exercício"));
    }
  };

  const handleImportTemplate = async (template: WorkoutTemplate) => {
    if (!userId) return;
    try {
      const result = await importTemplate.mutateAsync({ template, userId });
      toast.success(`${result.length} treinos criados a partir do template!`);
      setTemplateSheetOpen(false);
      setSelectedTemplate(null);
      setFilter("all");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao importar template"));
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3.5 px-5 pb-4 pt-4 safe-area-top lg:max-w-6xl lg:px-8 lg:pt-7">
      <div className="flex flex-col gap-1">
        <h1 className="display-title text-[28px] text-foreground">Meus treinos</h1>
        <p className="text-xs text-muted-foreground">Monte seus treinos ou importe um template pronto.</p>
      </div>

      {/* Busca + criar */}
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[11px] border border-border bg-card px-3 py-[11px]">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar treino ou exercício…"
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="button"
          aria-label="Criar treino"
          onClick={() => setCreating((v) => !v)}
          className="flex w-11 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-hard-sm active-hard"
        >
          <Plus className="h-[22px] w-[22px]" />
        </button>
      </div>

      {creating && (
        <div className="flex gap-2 animate-rise-in">
          <input
            type="text"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProgram()}
            placeholder="Nome do treino (ex: Treino A)"
            className="min-w-0 flex-1 rounded-[11px] border border-primary bg-card p-3 text-sm text-foreground outline-none"
          />
          <button
            type="button"
            disabled={createProgram.isPending || !newTitle.trim()}
            onClick={handleCreateProgram}
            className="rounded-[11px] bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-hard-sm active-hard disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-[9px] px-3 py-[7px] text-[11px]",
            filter === "all" ? "bg-primary font-bold text-primary-foreground" : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
          )}
        >
          Todos · {myPrograms.length}
        </button>
        <button
          type="button"
          onClick={() => setFilter("video")}
          className={cn(
            "rounded-[9px] px-3 py-[7px] text-[11px]",
            filter === "video" ? "bg-primary font-bold text-primary-foreground" : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
          )}
        >
          Com vídeo
        </button>
        <button
          type="button"
          onClick={() => setTemplateSheetOpen(true)}
          className="rounded-[9px] border border-border bg-secondary/60 px-3 py-[7px] text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
        >
          Templates
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : visiblePrograms.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={myPrograms.length === 0 ? "Nenhum treino cadastrado" : "Nada encontrado"}
          description={myPrograms.length === 0 ? "Monte o seu ou importe um template pronto." : "Tente outra busca ou filtro."}
          action={
            myPrograms.length === 0 ? (
              <button
                type="button"
                onClick={() => setTemplateSheetOpen(true)}
                className="rounded-[11px] bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground shadow-hard-sm active-hard"
              >
                Ver templates
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2 lg:hidden">
          {visiblePrograms.map((program) => {
            const exercises = (program.training_exercises ?? []).slice().sort((a, b) => a.position - b.position);
            const isOpen = expandedId === program.id;
            const letter = program.title.replace(/^treino\s+/i, "").charAt(0).toUpperCase() || program.title.charAt(0).toUpperCase();
            return (
              <div
                key={program.id}
                className={cn("overflow-hidden rounded-[18px] border bg-card", isOpen ? "border-border" : "border-border/60")}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : program.id)}
                  className={cn("flex w-full items-center gap-3 p-[15px] text-left", isOpen && "bg-gradient-to-b from-secondary/60 to-transparent")}
                >
                  <span
                    className={cn(
                      "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] font-mono text-base font-black",
                      isOpen ? "bg-primary text-primary-foreground" : "border border-border bg-secondary text-secondary-foreground",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="display-title truncate text-base text-foreground">{program.title}</span>
                    <span className="truncate font-mono text-[11px] uppercase text-muted-foreground">
                      {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"}
                    </span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-[22px] w-[22px] shrink-0 text-primary" />
                  ) : (
                    <ChevronDown className="h-[22px] w-[22px] shrink-0 text-muted-foreground/50" />
                  )}
                </button>

                {isOpen && (
                  <>
                    <div className="flex flex-col">
                      {exercises.map((e, idx) => {
                        const hasVideo = e.video_url && extractYouTubeId(e.video_url);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setEditing({ exercise: e, program })}
                            className="flex items-center gap-3 border-t border-border/50 px-4 py-[11px] text-left hover:bg-secondary/40"
                          >
                            <span className="min-w-[18px] font-mono text-[11px] font-semibold text-muted-foreground/50">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={cn(
                                "flex h-[34px] w-[56px] shrink-0 items-center justify-center rounded-lg",
                                hasVideo ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground/40",
                              )}
                            >
                              <PlayCircle className="h-[19px] w-[19px]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="truncate text-[13px] font-bold text-foreground">{e.title}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {e.sets}×{e.reps} · {e.load_kg} KG
                              </span>
                            </span>
                            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/40" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 border-t border-border/50 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPickerFor(program)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-secondary py-[11px] text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-[17px] w-[17px]" />
                        Exercício
                      </button>
                      <button
                        type="button"
                        disabled={exercises.length === 0}
                        onClick={() => setLiveProgram(program)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-primary py-[11px] text-xs font-extrabold text-primary-foreground shadow-hard-sm active-hard disabled:opacity-50"
                      >
                        <Play className="h-[17px] w-[17px] fill-current" />
                        Iniciar treino
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir treino"
                        onClick={() => setDeleteTarget({ id: program.id, title: program.title, count: exercises.length })}
                        className="flex w-10 items-center justify-center rounded-[10px] border border-border bg-secondary text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: fichas · editor · biblioteca (3 colunas, como no protótipo) */}
      {!isLoading && visiblePrograms.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-[248px_minmax(0,1fr)_300px] lg:items-start lg:gap-5">
          {/* Coluna 1 — Suas fichas */}
          <div className="flex flex-col gap-3">
            <span className="mono-label px-1">Suas fichas</span>
            <div className="flex flex-col gap-2">
              {visiblePrograms.map((program) => {
                const exercises = program.training_exercises ?? [];
                const isSelected = program.id === selectedProgram?.id;
                const groupsLabel = [...new Set(exercises.map((e) => muscleOf[e.title]).filter(Boolean))]
                  .slice(0, 2)
                  .join(" · ");
                return (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => setExpandedId(program.id)}
                    className={cn(
                      "flex flex-col gap-2 rounded-[14px] border p-3.5 text-left",
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-extrabold text-foreground">{program.title}</span>
                      <span className={cn("font-mono text-[11px] font-bold", isSelected ? "text-primary" : "text-muted-foreground")}>
                        {exercises.length} EX
                      </span>
                    </span>
                    {groupsLabel && (
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {groupsLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="flex h-[42px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-[18px] w-[18px]" />
              Criar ficha
            </button>
            {volumeByGroup.length > 0 && (
              <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5">
                <span className="mono-label">Volume por grupo</span>
                {volumeByGroup.map(([g, sets]) => (
                  <div key={g} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11px] font-semibold text-foreground/80">{g}</span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">{sets}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-sm bg-secondary">
                      <div
                        className="h-full origin-left animate-bar-in rounded-sm bg-primary"
                        style={{ width: `${(sets / volumeMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna 2 — Editor da ficha selecionada */}
          {selectedProgram ? (
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="display-title truncate text-[26px] text-foreground">{selectedProgram.title}</h2>
                  <span className="text-[13px] text-muted-foreground">
                    {selectedExercises.length} {selectedExercises.length === 1 ? "exercício" : "exercícios"} · {totalSets}{" "}
                    séries
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Excluir ficha"
                  onClick={() =>
                    setDeleteTarget({ id: selectedProgram.id, title: selectedProgram.title, count: selectedExercises.length })
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-card text-muted-foreground hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedExercises.length === 0}
                  onClick={() => setLiveProgram(selectedProgram)}
                  className="flex h-10 items-center gap-2 rounded-[11px] bg-primary px-4 text-[13px] font-extrabold text-primary-foreground shadow-hard-sm active-hard disabled:opacity-50"
                >
                  <Play className="h-[17px] w-[17px] fill-current" />
                  Iniciar treino
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-3.5">
                  <span className="mono-label">Carga total</span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                    {totalLoad.toLocaleString("pt-BR")} <span className="text-[13px] text-muted-foreground">kg</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-3.5">
                  <span className="mono-label">Séries</span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{totalSets}</span>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-3.5">
                  <span className="mono-label">Com vídeo</span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                    {selectedExercises.filter((e) => e.video_url && extractYouTubeId(e.video_url)).length}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-[16px] border border-border bg-card">
                <div className="grid grid-cols-[36px_minmax(0,1fr)_120px_70px] items-center gap-3.5 border-b border-border bg-secondary/50 px-4 py-2.5">
                  <span className="mono-label">#</span>
                  <span className="mono-label">Exercício</span>
                  <span className="mono-label">Séries · carga</span>
                  <span className="mono-label">Execução</span>
                </div>
                {selectedExercises.map((e, idx) => {
                  const hasVideo = e.video_url && extractYouTubeId(e.video_url);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEditing({ exercise: e, program: selectedProgram })}
                      className="grid w-full grid-cols-[36px_minmax(0,1fr)_120px_70px] items-center gap-3.5 border-b border-border/50 px-4 py-3 text-left last:border-b-0 hover:bg-secondary/40"
                    >
                      <span className="font-mono text-[13px] font-bold tabular-nums text-muted-foreground/60">{idx + 1}</span>
                      <span className="truncate text-sm font-bold text-foreground">{e.title}</span>
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground/80">
                        {e.sets}×{e.reps} · {e.load_kg} kg
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9px] font-bold tracking-[0.12em]",
                          hasVideo ? "text-primary" : "text-muted-foreground/50",
                        )}
                      >
                        {hasVideo ? "VÍDEO" : "—"}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPickerFor(selectedProgram)}
                  className="flex w-full items-center justify-center gap-1.5 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar exercício
                </button>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Coluna 3 — Biblioteca de exercícios */}
          <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="display-title text-sm text-foreground">Biblioteca</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {EXERCISES_BY_MUSCLE_GROUP[libGroup]?.length ?? 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setLibGroup(g)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px]",
                    g === libGroup
                      ? "bg-primary font-bold text-primary-foreground"
                      : "border border-border bg-secondary/60 font-semibold text-foreground/70 hover:border-primary",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto">
              {(EXERCISES_BY_MUSCLE_GROUP[libGroup] ?? []).map((ex) => (
                <button
                  key={ex.pt}
                  type="button"
                  disabled={!selectedProgram || addExercise.isPending}
                  onClick={() => addToSelected(ex.pt)}
                  title={selectedProgram ? `Adicionar em ${selectedProgram.title}` : undefined}
                  className="group flex items-center gap-2.5 rounded-[12px] border border-border/60 bg-secondary/40 p-2.5 text-left hover:border-primary disabled:opacity-50"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-bold text-foreground">{ex.pt}</span>
                    <span className="truncate font-mono text-[10px] uppercase text-muted-foreground/70">{ex.en}</span>
                  </span>
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground/60 group-hover:border-primary group-hover:text-primary">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banner de template */}
      <button
        type="button"
        onClick={() => setTemplateSheetOpen(true)}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-gradient-to-br from-secondary/60 to-card p-[15px] text-left hover:border-accent"
      >
        <Zap className="h-6 w-6 shrink-0 fill-accent/20 text-accent" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-extrabold text-foreground">Começar de um template</span>
          <span className="text-[11px] leading-snug text-muted-foreground">PPL, Upper/Lower, Full Body — treinos completos de uma vez.</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
      </button>

      {/* Sheet de templates */}
      <Sheet
        open={templateSheetOpen}
        onOpenChange={(o) => {
          setTemplateSheetOpen(o);
          if (!o) setSelectedTemplate(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
        >
          <div className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
            <div className="h-1 w-9 self-center rounded-full bg-border" />
            <div className="flex items-center gap-2.5">
              {selectedTemplate && (
                <button
                  type="button"
                  aria-label="Voltar aos templates"
                  onClick={() => setSelectedTemplate(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border bg-secondary text-foreground"
                >
                  <ChevronLeft className="h-[19px] w-[19px]" />
                </button>
              )}
              <div className="flex flex-col gap-0.5">
                <SheetTitle className="display-title text-xl text-foreground">
                  {selectedTemplate ? selectedTemplate.name : "Templates de treino"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedTemplate ? selectedTemplate.description : "Um split pronto vira seus treinos de uma vez."}
                </SheetDescription>
              </div>
            </div>

            {selectedTemplate ? (
              <>
                <div className="flex flex-col gap-2">
                  {selectedTemplate.days.map((day, i) => (
                    <div key={i} className="rounded-[13px] border border-border/60 bg-secondary/40 p-3">
                      <p className="mb-1.5 text-[13px] font-extrabold text-foreground">{day.name}</p>
                      <ul className="flex flex-col gap-1">
                        {day.exercises.map((ex, j) => (
                          <li key={j} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate">{ex.title}</span>
                            <span className="ml-2 shrink-0 font-mono">
                              {ex.sets}×{ex.reps}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={importTemplate.isPending}
                  onClick={() => handleImportTemplate(selectedTemplate)}
                  className="w-full rounded-[14px] bg-primary p-4 text-sm font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
                >
                  {importTemplate.isPending ? "Importando…" : `Importar ${selectedTemplate.days.length} treinos`}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {WORKOUT_TEMPLATES.map((template) => {
                  const totalExercises = template.days.reduce((acc, d) => acc + d.exercises.length, 0);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template)}
                      className="flex w-full items-center gap-3 rounded-[14px] border border-border/60 bg-secondary/40 p-4 text-left hover:border-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-foreground">{template.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase text-muted-foreground/70">
                          {template.days.length} dias · {totalExercises} exercícios
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ExercisePickerSheet open={!!pickerFor} onOpenChange={(o) => !o && setPickerFor(null)} onPick={handlePickExercise} />

      <ExerciseEditorSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        exercise={editing?.exercise ?? null}
        programTitle={editing?.program.title ?? ""}
        isSaving={updateExercise.isPending}
        onSave={async (fields) => {
          if (!editing) return;
          try {
            await updateExercise.mutateAsync({ id: editing.exercise.id, ...fields });
            toast.success("Exercício salvo.");
            setEditing(null);
          } catch {
            toast.error("Erro ao salvar exercício");
          }
        }}
        onDelete={async () => {
          if (!editing) return;
          try {
            await deleteExercise.mutateAsync({ id: editing.exercise.id });
            toast.success("Exercício removido.");
            setEditing(null);
          } catch {
            toast.error("Erro ao remover exercício");
          }
        }}
      />

      <LiveWorkoutSheet open={!!liveProgram} onOpenChange={(o) => !o && setLiveProgram(null)} program={liveProgram} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Excluir {deleteTarget?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.count
                ? `Os ${deleteTarget.count} exercícios e os vídeos vinculados vão junto. Isso não pode ser desfeito.`
                : "Isso não pode ser desfeito."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteProgram();
              }}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              {deleteProgram.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
