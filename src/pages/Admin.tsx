import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, KeyRound, Trash2, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Admin() {
  const { users, loading, error, createUser, resetPassword, deleteUser } = useAdminUsers();
  const { user: currentUser } = useAuth();

  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset password form
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete confirm
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      await createUser(newEmail, newPassword, newName);
      toast.success("Usuário criado com sucesso!");
      setNewEmail("");
      setNewPassword("");
      setNewName("");
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleReset = async () => {
    if (!resetUserId || !resetNewPw) return;
    if (resetNewPw.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setResetting(true);
    try {
      await resetPassword(resetUserId, resetNewPw);
      toast.success("Senha alterada com sucesso!");
      setResetUserId(null);
      setResetNewPw("");
    } catch (err: any) {
      toast.error(err.message);
    }
    setResetting(false);
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setDeleting(true);
    try {
      await deleteUser(deleteUserId);
      toast.success("Usuário removido!");
      setDeleteUserId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Admin</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {users.length} usuários
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 space-y-6">
        {/* Create User */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" placeholder="Mín. 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <Button className="mt-4" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Usuário"}
            </Button>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                          {r}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {/* Reset Password */}
                      <Dialog open={resetUserId === u.id} onOpenChange={(open) => { if (!open) { setResetUserId(null); setResetNewPw(""); } }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setResetUserId(u.id)} title="Resetar senha">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resetar Senha — {u.display_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Nova Senha</Label>
                              <Input type="password" placeholder="Mín. 6 caracteres" value={resetNewPw} onChange={(e) => setResetNewPw(e.target.value)} />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                            <Button onClick={handleReset} disabled={resetting}>
                              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Senha"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete */}
                      {u.id !== currentUser?.id && (
                        <Dialog open={deleteUserId === u.id} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(u.id)} title="Remover usuário">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Remover {u.display_name}?</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground py-4">Esta ação é irreversível. Todos os dados do usuário serão removidos.</p>
                            <DialogFooter>
                              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
