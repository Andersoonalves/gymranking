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
import { Copy, Check } from "lucide-react";
import { errorMessage } from "@/lib/utils";
import { toast } from "sonner";

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<{ id: string; name: string; invite_code: string } | null>;
  isCreating: boolean;
};

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const group = await onCreate(name.trim());
      if (group) {
        setInviteCode(group.invite_code);
        toast.success("Grupo criado!", { description: "Compartilhe o código para convidar amigos." });
      }
    } catch (err: unknown) {
      const message = errorMessage(err, "Não foi possível criar o grupo.");
      toast.error(message);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setName("");
      setInviteCode(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const copyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{inviteCode ? "Código de convite" : "Criar grupo"}</DialogTitle>
          <DialogDescription>
            {inviteCode
              ? "Compartilhe este código com seus amigos para eles entrarem no grupo."
              : "Dê um nome ao grupo. Você receberá um código para convidar amigos."}
          </DialogDescription>
        </DialogHeader>
        {inviteCode ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
              <code className="flex-1 text-center text-2xl font-mono font-bold tracking-widest text-foreground">
                {inviteCode}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome do grupo</Label>
              <Input
                id="group-name"
                placeholder="Ex: Academia do bairro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim() || isCreating}>
                {isCreating ? "Criando…" : "Criar grupo"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
