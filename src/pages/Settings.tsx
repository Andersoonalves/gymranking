import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups, useLeaveGroup } from "@/hooks/useGroups";
import { supabase } from "@/integrations/supabase/client";
import { GROUPS_STORAGE_KEY, NOTIFICATIONS_PREFERENCE_KEY } from "@/lib/constants";
import { getVapidPublicKey, subscribePush, subscriptionToPayload } from "@/lib/push";
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
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
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

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifications(true);
          localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, "true");
        }
      });
  }, [userId]);

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
    setNewPassword("");
    toast({ title: "Senha alterada!" });
  };

  const handleNotificationsChange = async (checked: boolean) => {
    if (!userId) return;
    setNotificationsLoading(true);
    try {
      if (checked) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast({ title: "Permissão de notificação negada", variant: "destructive" });
          setNotificationsLoading(false);
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const publicKey = await getVapidPublicKey(supabaseUrl, anonKey);
        const sub = await subscribePush(publicKey);
        if (!sub) {
          toast({ title: "Push não disponível neste dispositivo", variant: "destructive" });
          setNotificationsLoading(false);
          return;
        }
        const { endpoint, p256dh, auth } = subscriptionToPayload(sub);
        const { error } = await supabase.from("push_subscriptions").upsert(
          { user_id: userId, endpoint, p256dh, auth },
          { onConflict: "user_id" }
        );
        if (error) throw error;
        setNotifications(true);
        localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, "true");
        toast({ title: "Notificações ativadas" });
      } else {
        await supabase.from("push_subscriptions").delete().eq("user_id", userId);
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const reg = await navigator.serviceWorker.ready;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = await (reg as any).pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
        setNotifications(false);
        localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, "false");
        toast({ title: "Notificações desativadas" });
      }
    } catch (e) {
      toast({
        title: checked ? "Erro ao ativar notificações" : "Erro ao desativar notificações",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setNotificationsLoading(false);
    }
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
    } catch {
      toast({ title: "Erro ao sair do grupo", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>

      {/* Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" />
            Foto de perfil
          </CardTitle>
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

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Perfil
          </CardTitle>
          <CardDescription className="text-xs">Altere seu nome exibido no app</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="display-name" className="text-sm">Nome</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile || savingProfile}
                placeholder="Seu nome"
              />
            </div>
            <Button type="submit" size="sm" disabled={loadingProfile || savingProfile}>
              {savingProfile ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" />
            Alterar senha
          </CardTitle>
          <CardDescription className="text-xs">Defina uma nova senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm">Nova senha</Label>
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
            <Button type="submit" size="sm" disabled={savingPassword || !newPassword.trim()}>
              {savingPassword ? "Alterando…" : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription className="text-xs">Avisos quando alguém registrar um treino</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm">Ativar notificações</Label>
            <Switch
              id="notifications"
              checked={notifications}
              disabled={notificationsLoading}
              onCheckedChange={handleNotificationsChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                className="flex-1"
              >
                {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Groups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Meus grupos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você não está em nenhum grupo.</p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{g.invite_code}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyCode(g.invite_code, g.id)}
                    >
                      {copiedGroupId === g.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setLeaveGroupId(g.id)}
                >
                  Sair
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        Sair da conta
      </Button>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}
      </p>

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
