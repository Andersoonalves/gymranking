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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { useToast } from "@/hooks/use-toast";

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
    workout_type: string;
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
  const defaultDateTime = useMemo(() => toDateTimeLocalString(new Date()), []);

  const [workoutType, setWorkoutType] = useState<string>("");
  const [workoutDateTime, setWorkoutDateTime] = useState(defaultDateTime);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setWorkoutDateTime(toDateTimeLocalString(new Date()));
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setWorkoutType("");
      setWorkoutDateTime(toDateTimeLocalString(new Date()));
      setNotes("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutType.trim()) {
      toast({ title: "Selecione o tipo de treino", variant: "destructive" });
      return;
    }
    try {
      await onRegister({
        group_id: groupId,
        workout_type: workoutType.trim(),
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
            Grupo: {groupName}. Múltiplos treinos no mesmo dia são permitidos.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="workout-type">Tipo de treino</Label>
            <Select value={workoutType} onValueChange={setWorkoutType} required>
              <SelectTrigger id="workout-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={!workoutType.trim() || isPending}>
              {isPending ? "Registrando…" : "Registrar treino"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
