import { useState, useEffect, useMemo, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { NOTES_MAX_LENGTH } from "@/lib/constants";
import { useTrainingPrograms, type TrainingProgram } from "@/hooks/useTrainingPrograms";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn, errorMessage } from "@/lib/utils";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { CalendarClock, Camera, Check, ListChecks, Loader2, Search, X, Zap } from "lucide-react";
import { toast } from "sonner";

function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocalToISO(value: string): string {
  return new Date(value).toISOString();
}

/** Usa o dia do calendário com o horário atual do relógio (registro retroativo no mesmo "momento" do dia). */
function mergeCalendarDayWithCurrentClock(day: Date): Date {
  const out = new Date(day);
  const now = new Date();
  out.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return out;
}

type RegisterWorkoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando definido ao abrir, pré-preenche data/hora com este dia (e hora atual). */
  initialTargetDate?: Date | null;
  /** Só para listar os programas de treino, que continuam sendo por grupo. */
  groupIds: string[];
  onRegister: (params: {
    workout_types: string[];
    workout_date: string;
    notes?: string | null;
    photo_url?: string | null;
  }) => Promise<unknown>;
  isPending: boolean;
};

type WhenChoice = "now" | "yesterday" | "custom";

export function RegisterWorkoutSheet({
  open,
  onOpenChange,
  initialTargetDate = null,
  groupIds,
  onRegister,
  isPending,
}: RegisterWorkoutSheetProps) {
  const { user } = useAuth();
  const { data: myPrograms = [] } = useTrainingPrograms(user?.id);

  const [source, setSource] = useState<"general" | "programs">("general");
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [when, setWhen] = useState<WhenChoice>("now");
  const [customDateTime, setCustomDateTime] = useState(() => toDateTimeLocalString(new Date()));
  const [notes, setNotes] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFile = async (file: File) => {
    setCropFile(null);
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande", { description: "O tamanho máximo é 5 MB." });
      return;
    }
    setUploadingPhoto(true);
    setPhotoPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    // O caminho tem timestamp, então o objeto nunca muda: cache de 1 ano.
    const { error } = await supabase.storage
      .from("workout-photos")
      .upload(path, file, { upsert: true, cacheControl: "31536000" });
    setUploadingPhoto(false);
    if (error) {
      toast.error("Erro ao enviar foto");
      setPhotoPreview(null);
      return;
    }
    setPhotoPath(path);
  };

  // O reset do input vem antes do picker, nunca depois de ler o File: no Android
  // o arquivo da galeria e um content:// que o reset invalida. Zerar aqui ainda
  // permite reescolher a mesma foto.
  const openPhotoPicker = () => {
    if (!photoInputRef.current) return;
    photoInputRef.current.value = "";
    photoInputRef.current.click();
  };

  const clearPhoto = () => {
    setPhotoPath(null);
    setPhotoPreview(null);
  };

  useEffect(() => {
    if (!open) return;
    if (initialTargetDate != null) {
      setWhen("custom");
      setCustomDateTime(toDateTimeLocalString(mergeCalendarDayWithCurrentClock(initialTargetDate)));
    } else {
      setWhen("now");
      setCustomDateTime(toDateTimeLocalString(new Date()));
    }
  }, [open, initialTargetDate]);

  const resolveDate = (): string => {
    if (when === "now") return new Date().toISOString();
    if (when === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    return parseDateTimeLocalToISO(customDateTime);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedTypes([]);
      setNotes("");
      setSearch("");
      setSource("general");
      setWhen("now");
      clearPhoto();
    }
    onOpenChange(next);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return WORKOUT_TYPES as readonly string[];
    return WORKOUT_TYPES.filter((t) => t.toLowerCase().includes(q));
  }, [search]);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return myPrograms;
    return myPrograms.filter((p) => p.title.toLowerCase().includes(q));
  }, [myPrograms, search]);

  const register = async (params: { workout_types: string[]; workout_date: string; notes: string | null; photo_url?: string | null }) => {
    try {
      await onRegister(params);
      toast.success("Treino registrado!");
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Não foi possível registrar o treino."));
    }
  };

  /** Atalho de 1 toque: registra o treino salvo agora, sem mais perguntas. */
  const quickRegister = (program: TrainingProgram) => {
    if (isPending) return;
    const exercises = (program.training_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((ex) => ex.title);
    register({
      workout_types: [program.title],
      workout_date: new Date().toISOString(),
      notes: exercises.length > 0 ? exercises.join(", ") : null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const types = selectedTypes.filter((t) => t.trim());
    if (types.length === 0) {
      toast.error("Selecione pelo menos um tipo de treino");
      return;
    }
    register({ workout_types: types, workout_date: resolveDate(), notes: notes.trim() || null, photo_url: photoPath });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal lg:!w-[920px]"
      >
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex flex-col gap-1">
            <SheetTitle className="display-title text-[22px] text-foreground">Registrar treino</SheetTitle>
            <span className="hidden font-mono text-xs text-muted-foreground lg:block">Leva menos de 10 segundos</span>
          </div>

          {/* Atalhos de 1 toque */}
          {myPrograms.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                <span className="mono-label">Repetir um treino salvo · 1 toque</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {myPrograms.slice(0, 4).map((p) => {
                    const count = p.training_exercises?.length ?? 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => quickRegister(p)}
                        className="flex min-w-[110px] flex-1 flex-col items-start gap-1 rounded-[13px] border border-border bg-secondary/60 p-[11px] text-left transition-colors hover:border-primary disabled:opacity-50"
                      >
                        <Zap className="h-[18px] w-[18px] fill-primary/20 text-primary" />
                        <span className="w-full truncate text-xs font-extrabold text-foreground">{p.title}</span>
                        <span className="font-mono text-[9px] uppercase text-muted-foreground">
                          {count} {count === 1 ? "exercício" : "exercícios"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-px bg-border" />
            </>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
            {/* Coluna esquerda (desktop): tipos, observações e foto */}
            <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3.5">
            {/* Tipos */}
            <div className="order-1 flex flex-col gap-2 lg:order-none">
              <div className="flex items-center justify-between">
                <span className="mono-label">
                  Tipos{selectedTypes.length > 0 && ` · ${selectedTypes.length} ${selectedTypes.length === 1 ? "selecionado" : "selecionados"}`}
                </span>
                <div className="flex gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
                  <button
                    type="button"
                    onClick={() => setSource("general")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px]",
                      source === "general" ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
                    )}
                  >
                    Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource("programs")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px]",
                      source === "programs" ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
                    )}
                  >
                    Meus treinos
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-[11px] border border-border bg-background px-3 py-[9px]">
                <Search className="h-[18px] w-[18px] text-muted-foreground/60" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar tipo de treino…"
                  className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              {source === "general" ? (
                <div className="flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto">
                  {filteredTypes.map((type) => {
                    const on = selectedTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleType(type)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[10px] border px-3 py-[9px] text-xs font-bold transition-colors",
                          on
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-secondary/60 text-secondary-foreground hover:border-primary",
                        )}
                      >
                        {on && <Check className="h-[15px] w-[15px]" strokeWidth={3} />}
                        {type}
                      </button>
                    );
                  })}
                  {filteredTypes.length === 0 && (
                    <span className="py-2 text-xs text-muted-foreground">Nenhum tipo com esse nome.</span>
                  )}
                </div>
              ) : filteredPrograms.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-center">
                  <ListChecks className="h-6 w-6 text-muted-foreground/50" />
                  <span className="px-4 text-xs text-muted-foreground">
                    Nenhum treino cadastrado ainda. Monte um na aba Treinos.
                  </span>
                </div>
              ) : (
                <div className="flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto">
                  {filteredPrograms.map((p) => {
                    const on = selectedTypes.includes(p.title);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleType(p.title)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[10px] border px-3 py-[9px] text-xs font-bold transition-colors",
                          on
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-secondary/60 text-secondary-foreground hover:border-primary",
                        )}
                      >
                        {on && <Check className="h-[15px] w-[15px]" strokeWidth={3} />}
                        {p.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            </div>

            {/* Coluna direita (desktop): quando, resumo e ações */}
            <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3.5">
            {/* Quando */}
            <div className="order-2 flex flex-col gap-1.5 lg:order-none">
              <span className="mono-label">Quando</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setWhen("now")}
                  className={cn(
                    "flex-1 rounded-[10px] py-2.5 text-xs",
                    when === "now"
                      ? "bg-primary font-extrabold text-primary-foreground"
                      : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
                  )}
                >
                  Agora
                </button>
                <button
                  type="button"
                  onClick={() => setWhen("yesterday")}
                  className={cn(
                    "flex-1 rounded-[10px] py-2.5 text-xs",
                    when === "yesterday"
                      ? "bg-primary font-extrabold text-primary-foreground"
                      : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
                  )}
                >
                  Ontem
                </button>
                <button
                  type="button"
                  aria-label="Escolher data e hora"
                  onClick={() => setWhen("custom")}
                  className={cn(
                    "flex w-[42px] items-center justify-center rounded-[10px]",
                    when === "custom" ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/60 text-muted-foreground",
                  )}
                >
                  <CalendarClock className="h-[17px] w-[17px]" />
                </button>
              </div>
              {when === "custom" && (
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  disabled={isPending}
                  className="rounded-[11px] border border-border bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary"
                />
              )}
            </div>

            {/* Observações */}
            <div className="order-3 flex flex-col gap-1.5 lg:order-none">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="workout-notes" className="mono-label">
                  Observações · opcional
                </label>
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    notes.length >= NOTES_MAX_LENGTH ? "text-accent" : "text-muted-foreground/60",
                  )}
                >
                  {notes.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="workout-notes"
                placeholder="Ex: 3 séries, treino leve…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                maxLength={NOTES_MAX_LENGTH}
                rows={2}
                className="resize-none rounded-[11px] border border-border bg-background p-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary"
              />
            </div>

            {/* Foto-prova opcional */}
            <div className="order-4 flex flex-col gap-1.5 lg:order-none">
              <span className="mono-label">Foto de prova · opcional</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCropFile(f);
                }}
              />
              <ImageCropDialog
                file={cropFile}
                onCancel={() => setCropFile(null)}
                onConfirm={handlePhotoFile}
              />
              {photoPreview ? (
                <div className="relative h-20 w-20">
                  <img src={photoPreview} alt="Prévia da foto do treino" className="h-20 w-20 rounded-xl border border-border object-cover" />
                  {uploadingPhoto && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={clearPhoto}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openPhotoPicker}
                  className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-secondary/40 px-3.5 py-3 text-left hover:border-accent"
                >
                  <Camera className="h-5 w-5 shrink-0 text-accent" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">Anexar prova</span>
                    <span className="text-[10px] leading-snug text-muted-foreground">Selfie suada, aparelho, print — o grupo vê no feed.</span>
                  </span>
                </button>
              )}
            </div>

            {/* Resumo (desktop) */}
            <div className="hidden flex-col gap-3 rounded-[14px] border border-border bg-secondary/40 p-4 lg:flex">
              <span className="mono-label">Resumo</span>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Tipos</span>
                <span className="text-right text-[13px] font-bold text-foreground">
                  {selectedTypes.length > 0 ? selectedTypes.join(", ") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Data</span>
                <span className="font-mono text-[13px] font-bold text-foreground">
                  {when === "now"
                    ? "Agora"
                    : when === "yesterday"
                      ? "Ontem"
                      : customDateTime.replace("T", " · ")}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Grupos</span>
                <span className="font-mono text-[13px] font-bold text-primary">{groupIds.length}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedTypes.length === 0 || isPending || uploadingPhoto}
              className="order-5 relative flex w-full items-center justify-center overflow-hidden rounded-[14px] bg-primary p-[17px] text-[15px] font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50 lg:order-none"
            >
              <span className="absolute left-0 top-0 h-full w-2/5 animate-sheen bg-gradient-to-r from-transparent via-white/55 to-transparent [animation-duration:3.2s]" />
              {isPending ? "Registrando…" : "Registrar treino"}
            </button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
