import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import {
  useTrainingPrograms,
  useCreateProgram,
  useDeleteProgram,
  useAddExercise,
  useDeleteExercise,
  type TrainingProgram,
} from "@/hooks/useTrainingPrograms";
import { useImportTemplate } from "@/hooks/useImportTemplate";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { WORKOUT_TEMPLATES, type WorkoutTemplate } from "@/lib/workout-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { PlusCircle, Trash2, ChevronDown, Dumbbell, BookOpen, ChevronRight, Clock, Flame, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LEVEL_ICONS: Record<string, typeof Flame> = {
  "iniciante": Zap,
  "intermediário": Flame,
  "avançado": Flame,
};

function getTemplateLevel(template: WorkoutTemplate): string {
  if (template.id.includes("stronglifts") || template.id === "full-body") return "iniciante";
  if (template.id.includes("6d") || template.id === "arnold-split") return "avançado";
  return "intermediário";
}

function getTemplateDays(template: WorkoutTemplate): number {
  return template.days.length;
}

export default function Treinos() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const { toast } = useToast();

  const selectedGroupId =
    typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const { data: programs = [], isLoading } = useTrainingPrograms(selectedGroup?.id);
  const createProgram = useCreateProgram();
  const deleteProgram = useDeleteProgram();
  const addExercise = useAddExercise();
  const deleteExercise = useDeleteExercise();
  const importTemplate = useImportTemplate();

  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);

  const myPrograms = programs.filter((p) => p.user_id === userId);

  const handleCreateProgram = async () => {
    if (!newTitle.trim() || !userId || !selectedGroup) return;
    try {
      await createProgram.mutateAsync({ user_id: userId, group_id: selectedGroup.id, title: newTitle.trim() });
      setNewTitle("");
      toast({ title: "Treino criado!" });
    } catch {
      toast({ title: "Erro ao criar treino", variant: "destructive" });
    }
  };

  const handleDeleteProgram = async () => {
    if (!deleteTarget || !selectedGroup) return;
    try {
      await deleteProgram.mutateAsync({ id: deleteTarget.id, group_id: selectedGroup.id });
      setDeleteTarget(null);
      toast({ title: "Treino excluído." });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleImportTemplate = async (template: WorkoutTemplate) => {
    if (!userId || !selectedGroup) return;
    try {
      const result = await importTemplate.mutateAsync({
        template,
        userId,
        groupId: selectedGroup.id,
      });
      toast({ title: `${result.length} treinos criados a partir do template!` });
      setTemplateSheetOpen(false);
      setSelectedTemplate(null);
    } catch {
      toast({ title: "Erro ao importar template", variant: "destructive" });
    }
  };

  if (!selectedGroup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Selecione ou crie um grupo primeiro.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Meus Treinos</h1>
        <p className="text-xs text-muted-foreground">Monte seus treinos ou use um template pronto</p>
      </div>

      {/* Create new program */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do treino (ex: Treino A)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProgram()}
              className="h-9"
            />
            <Button onClick={handleCreateProgram} disabled={createProgram.isPending || !newTitle.trim()} className="gap-1.5 shrink-0 h-9">
              <PlusCircle className="h-4 w-4" />
              Criar
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 h-9"
            onClick={() => setTemplateSheetOpen(true)}
          >
            <BookOpen className="h-4 w-4" />
            Usar template pronto
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : myPrograms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum treino cadastrado ainda.</p>
        </div>
      ) : (
        myPrograms.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            groupId={selectedGroup.id}
            onDelete={() => setDeleteTarget({ id: program.id, title: program.title })}
            onAddExercise={addExercise}
            onDeleteExercise={deleteExercise}
          />
        ))
      )}

      {/* Template selector sheet */}
      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Templates de treino</SheetTitle>
            <SheetDescription>
              Escolha um split pronto para criar seus treinos automaticamente
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-sm">{selectedTemplate.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedTemplate.days.map((day, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-sm font-medium mb-2">{day.name}</p>
                      <ul className="space-y-1">
                        {day.exercises.map((ex, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex justify-between">
                            <span>{ex.title}</span>
                            <span className="shrink-0 ml-2">{ex.sets}×{ex.reps}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => handleImportTemplate(selectedTemplate)}
                  disabled={importTemplate.isPending}
                >
                  {importTemplate.isPending ? "Importando…" : `Importar ${selectedTemplate.days.length} treinos`}
                </Button>
              </div>
            ) : (
              WORKOUT_TEMPLATES.map((template) => {
                const level = getTemplateLevel(template);
                const days = getTemplateDays(template);
                const totalExercises = template.days.reduce((acc, d) => acc + d.exercises.length, 0);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template)}
                    className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {days} dias
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {totalExercises} exercícios
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          level === "iniciante" ? "bg-green-500/10 text-green-600" :
                          level === "avançado" ? "bg-red-500/10 text-red-600" :
                          "bg-yellow-500/10 text-yellow-600"
                        }`}>
                          {level}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              O treino &quot;{deleteTarget?.title}&quot; e todas as suas atividades serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteProgram(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProgramCard({
  program,
  groupId,
  onDelete,
  onAddExercise,
  onDeleteExercise,
}: {
  program: TrainingProgram;
  groupId: string;
  onDelete: () => void;
  onAddExercise: ReturnType<typeof useAddExercise>;
  onDeleteExercise: ReturnType<typeof useDeleteExercise>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sets, setSets] = useState("3");
  const [load, setLoad] = useState("0");
  const [reps, setReps] = useState("12");
  const { toast } = useToast();

  const exercises = (program.training_exercises ?? []).sort((a, b) => a.position - b.position);

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      await onAddExercise.mutateAsync({
        program_id: program.id,
        group_id: groupId,
        title: title.trim(),
        sets: Number(sets) || 3,
        load_kg: Number(load) || 0,
        reps: Number(reps) || 12,
        position: exercises.length,
      });
      setTitle("");
      setSets("3");
      setLoad("0");
      setReps("12");
    } catch {
      toast({ title: "Erro ao adicionar atividade", variant: "destructive" });
    }
  };

  const handleRemove = async (exId: string) => {
    try {
      await onDeleteExercise.mutateAsync({ id: exId, group_id: groupId });
    } catch {
      toast({ title: "Erro ao remover atividade", variant: "destructive" });
    }
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-left flex-1 min-w-0">
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
                <CardTitle className="text-sm truncate">{program.title}</CardTitle>
                <span className="shrink-0 text-xs text-muted-foreground">({exercises.length})</span>
              </button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 px-3 pb-3 pt-0">
            {exercises.length > 0 && (
              <ul className="space-y-1.5">
                {exercises.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{ex.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets}×{ex.reps} · {ex.load_kg}kg
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(ex.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Input placeholder="Nome da atividade" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Séries</label>
                  <Input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carga (kg)</label>
                  <Input type="number" min="0" value={load} onChange={(e) => setLoad(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Reps</label>
                  <Input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={onAddExercise.isPending || !title.trim()}>
                <PlusCircle className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
