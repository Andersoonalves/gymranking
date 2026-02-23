import { useState, useMemo, useEffect } from "react";
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
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { useTrainingPrograms, type TrainingProgram } from "@/hooks/useTrainingPrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, CheckCircle2 } from "lucide-react";

function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocalToISO(value: string): string {
  return new Date(value).toISOString();
}

type RegisterWorkoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onRegister: (params: {
    group_id: string;
    workout_types: string[];
    workout_date: string;
    notes?: string | null;
  }) => Promise<unknown>;
  isPending: boolean;
};

export function RegisterWorkoutSheet({
  open,
  onOpenChange,
  groupId,
  groupName,
  onRegister,
  isPending,
}: RegisterWorkoutSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const defaultDateTime = useMemo(() => toDateTimeLocalString(new Date()), []);
  const { data: programs = [] } = useTrainingPrograms(groupId);
  const myPrograms = programs.filter((p) => p.user_id === user?.id);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [workoutDateTime, setWorkoutDateTime] = useState(defaultDateTime);
  const [notes, setNotes] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setWorkoutDateTime(toDateTimeLocalString(new Date()));
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedTypes([]);
      setWorkoutDateTime(toDateTimeLocalString(new Date()));
      setNotes("");
      setSelectedProgramId(null);
    }
    onOpenChange(next);
  };

  const toggleType = (type: string) => {
    setSelectedProgramId(null);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
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
        group_id: groupId,
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar treino</SheetTitle>
          <SheetDescription>
            Grupo: {groupName}. Selecione um tipo ou escolha um treino salvo.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo(s) de treino</Label>
            <Tabs defaultValue="types">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="types">Categorias</TabsTrigger>
                <TabsTrigger value="my-programs">Meus Treinos</TabsTrigger>
              </TabsList>
              <TabsContent value="types">
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WORKOUT_TYPES.map((type) => (
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