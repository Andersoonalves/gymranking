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
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { PlusCircle, Trash2, ChevronDown, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

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

  if (!selectedGroup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Selecione ou crie um grupo primeiro.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Treinos</h1>
        <p className="text-sm text-muted-foreground">Monte seus treinos e organize suas atividades</p>
      </div>

      {/* Create new program */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do treino (ex: Treino A)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProgram()}
            />
            <Button onClick={handleCreateProgram} disabled={createProgram.isPending || !newTitle.trim()} className="gap-1.5 shrink-0">
              <PlusCircle className="h-4 w-4" />
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : myPrograms.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum treino cadastrado ainda.</p>
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

/* ---------- Program Card with exercises ---------- */

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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-left flex-1">
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
                <CardTitle className="text-base">{program.title}</CardTitle>
                <span className="text-xs text-muted-foreground ml-1">({exercises.length} atividades)</span>
              </button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {exercises.length > 0 && (
              <ul className="space-y-2">
                {exercises.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ex.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets} séries × {ex.reps} reps · {ex.load_kg}kg
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

            {/* Add exercise form */}
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Input placeholder="Nome da atividade" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Séries</label>
                  <Input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carga (kg)</label>
                  <Input type="number" min="0" value={load} onChange={(e) => setLoad(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Repetições</label>
                  <Input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} />
                </div>
              </div>
              <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={onAddExercise.isPending || !title.trim()}>
                <PlusCircle className="h-4 w-4" />
                Adicionar atividade
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
