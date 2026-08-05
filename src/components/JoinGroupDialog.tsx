import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/utils";
import { toast } from "sonner";

type JoinGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (code: string) => Promise<{ id: string; name: string } | null>;
  isJoining: boolean;
};

export function JoinGroupDialog({
  open,
  onOpenChange,
  onJoin,
  isJoining,
}: JoinGroupDialogProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const group = await onJoin(trimmed);
      if (group) {
        toast.success(`Você entrou em "${group.name}".`);
        setCode("");
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message = errorMessage(err, "Não foi possível entrar no grupo.");
      toast.error(message);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) setCode("");
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar em um grupo</DialogTitle>
          <DialogDescription>
            Digite o código de convite que você recebeu de um amigo para entrar no grupo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Código do grupo</Label>
            <Input
              id="invite-code"
              placeholder="Ex: A1B2C3D4"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isJoining}
              className="font-mono tracking-widest uppercase"
              maxLength={12}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!code.trim() || isJoining}>
              {isJoining ? "Entrando…" : "Entrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
