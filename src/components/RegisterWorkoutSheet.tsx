import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WORKOUT_TYPES, MUSCLE_GROUPS } from "@/lib/workout-types";
import { EXERCISES_BY_MUSCLE_GROUP } from "@/lib/exercises";
import { useTrainingPrograms, type TrainingProgram } from "@/hooks/useTrainingPrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

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
  groupIds: string[];
  onRegister: (params: {
    group_ids: string[];
    workout_types: string[];
    workout_date: string;
    notes?: string | null;
  }) => Promise<unknown>;
  isPending: boolean;
};

export function RegisterWorkoutSheet({
  open,
  onOpenChange,
  initialTargetDate = null,
  groupIds,
  onRegister,
  isPending,
}: RegisterWorkoutSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const firstGroupId = groupIds[0];
  const { data: programs = [] } = useTrainingPrograms(firstGroupId);
  const myPrograms = programs.filter((p) => p.user_id === user?.id);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [workoutDateTime, setWorkoutDateTime] = useState(() =>
    toDateTimeLocalString(new Date()),
  );
  const [notes, setNotes] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Muscle group drill-down state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const exercisesForGroup = useMemo(() => {
    if (!selectedMuscleGroup) return [];
    return EXERCISES_BY_MUSCLE_GROUP[selectedMuscleGroup] ?? [];
  }, [selectedMuscleGroup]);

  useEffect(() => {
    if (!open) return;
    const base =
      initialTargetDate != null
        ? mergeCalendarDayWithCurrentClock(initialTargetDate)
        : new Date();
    setWorkoutDateTime(toDateTimeLocalString(base));
  }, [open, initialTargetDate]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedTypes([]);
      setWorkoutDateTime(toDateTimeLocalString(new Date()));
      setNotes("");
      setSelectedProgramId(null);
      setSelectedMuscleGroup(null);
      setSelectedExercises([]);
    }
    onOpenChange(next);
  };

  const toggleType = (type: string) => {
    setSelectedProgramId(null);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseName) ? prev.filter((e) => e !== exerciseName) : [...prev, exerciseName]
    );
  };

  const confirmExercises = () => {
    if (selectedExercises.length === 0) return;
    // Build notes from selected exercises
    const exerciseSummary = selectedExercises.join(", ");
    setNotes((prev) => (prev ? `${prev}\n${exerciseSummary}` : exerciseSummary));
    // Add muscle group as type if not already selected
    if (selectedMuscleGroup && !selectedTypes.includes(selectedMuscleGroup)) {
      setSelectedTypes((prev) => [...prev, selectedMuscleGroup]);
    }
    setSelectedMuscleGroup(null);
    setSelectedExercises([]);
  };

  const selectProgram = (program: TrainingProgram) => {
    setSelectedProgramId(program.id);
    const exerciseTitles = (program.training_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((ex) => ex.title);
    // Use program title as workout type, and exercises as notes
    setSelectedTypes([program.title]);
    const exercisesSummary = exerciseTitles.length > 0
      ? exerciseTitles.join(", ")
      : "";
    setNotes(exercisesSummary);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const types = selectedTypes.filter((t) => t.trim());
    if (types.length === 0) {
      toast({ title: "Selecione pelo menos um tipo de treino", variant: "destructive" });
      return;
    }
    try {
      await onRegister({
        group_ids: groupIds,
        workout_types: types,
        workout_date: parseDateTimeLocalToISO(workoutDateTime),
        notes: notes.trim() || null,
      });
      toast({ title: "Treino registrado!" });
      handleOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível registrar o treino.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  // Muscle group drill-down view
  if (selectedMuscleGroup) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedMuscleGroup(null);
                  setSelectedExercises([]);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {selectedMuscleGroup}
            </SheetTitle>
            <SheetDescription>
              Selecione os exercícios realizados ({selectedExercises.length} selecionados)
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] rounded-md border p-3">
              <div className="grid grid-cols-1 gap-2">
                {exercisesForGroup.map((ex) => (
                  <label
                    key={ex.pt}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedExercises.includes(ex.pt)}
                      onCheckedChange={() => toggleExercise(ex.pt)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{ex.pt}</span>
                      <span className="block text-xs text-muted-foreground">{ex.en}</span>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedMuscleGroup(null);
                setSelectedExercises([]);
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={confirmExercises}
              disabled={selectedExercises.length === 0}
            >
              Confirmar ({selectedExercises.length})
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar treino</SheetTitle>
          <SheetDescription>
            Selecione um tipo ou escolha um treino salvo. O registro vale para todos os seus grupos.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo(s) de treino</Label>
            <Tabs defaultValue="muscle-groups">
              <TabsList className="grid w-full grid-cols-3 mb-2">
                <TabsTrigger value="muscle-groups">Grupos</TabsTrigger>
                <TabsTrigger value="types">Geral</TabsTrigger>
                <TabsTrigger value="my-programs">Meus Treinos</TabsTrigger>
              </TabsList>

              <TabsContent value="muscle-groups">
                <ScrollArea className="h-[250px] rounded-md border p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MUSCLE_GROUPS.map((group) => {
                      const count = EXERCISES_BY_MUSCLE_GROUP[group]?.length ?? 0;
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setSelectedMuscleGroup(group)}
                          className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm font-medium">{group}</span>
                          <span className="text-xs text-muted-foreground">{count} exercícios</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="types">
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WORKOUT_TYPES.filter((t) => !MUSCLE_GROUPS.includes(t)).map((type) => (
                      <label
                        key={type}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                          disabled={isPending}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="my-programs">
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  {myPrograms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                      <Dumbbell className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Nenhum treino cadastrado. Crie um na aba Treinos.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {myPrograms.map((program) => {
                        const exercises = (program.training_exercises ?? []).sort((a, b) => a.position - b.position);
                        const isSelected = selectedProgramId === program.id;
                        return (
                          <button
                            key={program.id}
                            type="button"
                            onClick={() => selectProgram(program)}
                            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "hover:bg-muted/50"
                            }`}
                            disabled={isPending}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {program.title}
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                              </p>
                              {exercises.length > 0 && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {exercises.map((ex) => ex.title).join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {exercises.length} ativ.
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
            {selectedTypes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedTypes.length} selecionado(s): {selectedTypes.join(", ")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="workout-datetime">Data e hora</Label>
            <Input
              id="workout-datetime"
              type="datetime-local"
              value={workoutDateTime}
              onChange={(e) => setWorkoutDateTime(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="workout-notes">Observações (opcional)</Label>
            <Textarea
              id="workout-notes"
              placeholder="Ex: 3 séries, treino leve..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={2}
              className="resize-none"
            />
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={selectedTypes.length === 0 || isPending}>
              {isPending ? "Registrando…" : "Registrar treino"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
