import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups, useLeaveGroup } from "@/hooks/useGroups";
import { supabase } from "@/integrations/supabase/client";
import { GROUPS_STORAGE_KEY, NOTIFICATIONS_PREFERENCE_KEY } from "@/lib/constants";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, LogOut, User, Key, Bell, Palette, Users, Camera } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
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

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const leaveGroup = useLeaveGroup(userId);

  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [leaveGroupId, setLeaveGroupId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", userId).single();
      if (data?.display_name) setDisplayName(data.display_name);
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      setLoadingProfile(false);
    })();
  }, [userId]);

  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_PREFERENCE_KEY);
    setNotifications(stored === "true");
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", userId);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Nome atualizado!" });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast({ title: "Senha alterada!" });
  };

  const handleNotificationsChange = (checked: boolean) => {
    setNotifications(checked);
    localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, String(checked));
    toast({ title: checked ? "Notificações ativadas" : "Notificações desativadas" });
  };

  const copyCode = (code: string, groupId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedGroupId(groupId);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  const handleLeaveGroup = async () => {
    if (!leaveGroupId) return;
    try {
      await leaveGroup.mutateAsync(leaveGroupId);
      if (localStorage.getItem(GROUPS_STORAGE_KEY) === leaveGroupId) {
        const rest = groups.filter((g) => g.id !== leaveGroupId);
        localStorage.setItem(GROUPS_STORAGE_KEY, rest[0]?.id ?? "");
      }
      toast({ title: "Você saiu do grupo." });
      setLeaveGroupId(null);
    } catch (e) {
      toast({ title: "Erro ao sair do grupo", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto de perfil
          </CardTitle>
          <CardDescription>Adicione ou troque sua foto</CardDescription>
        </CardHeader>
        <CardContent>
          {userId && (
            <AvatarUpload
              userId={userId}
              currentUrl={avatarUrl}
              displayName={displayName}
              onUploaded={(url) => setAvatarUrl(url)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Altere seu nome exibido no app</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Nome</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile || savingProfile}
                placeholder="Seu nome"
              />
            </div>
            <Button type="submit" disabled={loadingProfile || savingProfile}>
              {savingProfile ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar senha
          </CardTitle>
          <CardDescription>Defina uma nova senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={savingPassword}
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={savingPassword || !newPassword.trim()}>
              {savingPassword ? "Alterando…" : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Preparado para notificações push no futuro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Ativar notificações</Label>
            <Switch id="notifications" checked={notifications} onCheckedChange={handleNotificationsChange} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>Tema claro ou escuro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              Claro
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              Escuro
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
            >
              Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Meus grupos
          </CardTitle>
          <CardDescription>Código de convite e opção de sair do grupo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você não está em nenhum grupo.</p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{g.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono text-muted-foreground">{g.invite_code}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyCode(g.invite_code, g.id)}
                    >
                      {copiedGroupId === g.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setLeaveGroupId(g.id)}
                >
                  Sair
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!leaveGroupId} onOpenChange={(open) => !open && setLeaveGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você deixará de ver o ranking e a atividade deste grupo. Pode entrar de novo depois com o código.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
