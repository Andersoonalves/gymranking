import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups, useLeaveGroup } from "@/hooks/useGroups";
import { useMyProfile, useUpdateWeeklyGoal } from "@/hooks/useMyProfile";
import { supabase } from "@/integrations/supabase/client";
import { GROUPS_STORAGE_KEY, NOTIFICATIONS_PREFERENCE_KEY } from "@/lib/constants";
import { getVapidPublicKey, subscribePush, subscriptionToPayload } from "@/lib/push";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ShareInviteButton } from "@/components/ShareInviteButton";
import { cn } from "@/lib/utils";
import { Check, Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
      <span className="mono-label">{label}</span>
      {children}
    </div>
  );
}

const pushSupported =
  typeof window !== "undefined" && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const { data: myProfile } = useMyProfile(userId);
  const updateWeeklyGoal = useUpdateWeeklyGoal(userId);
  const leaveGroup = useLeaveGroup(userId);

  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
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
      .select("id, weekly_summary")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifications(true);
          setWeeklySummary(data.weekly_summary);
          localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, "true");
        }
      });
  }, [userId]);

  const handleWeeklySummaryChange = async (checked: boolean) => {
    if (!userId) return;
    setWeeklySummary(checked);
    const { error } = await supabase.from("push_subscriptions").update({ weekly_summary: checked }).eq("user_id", userId);
    if (error) {
      setWeeklySummary(!checked);
      toast.error("Erro ao salvar preferência");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", userId);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Nome atualizado!");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    toast.success("Senha alterada!");
  };

  const handleNotificationsChange = async (checked: boolean) => {
    if (!userId) return;
    setNotificationsLoading(true);
    try {
      if (checked) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Permissão de notificação negada");
          setNotificationsLoading(false);
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const publicKey = await getVapidPublicKey(supabaseUrl, anonKey);
        const sub = await subscribePush(publicKey);
        if (!sub) {
          toast.error("Push não disponível neste dispositivo");
          setNotificationsLoading(false);
          return;
        }
        const { endpoint, p256dh, auth } = subscriptionToPayload(sub);
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "user_id" });
        if (error) throw error;
        setNotifications(true);
        localStorage.setItem(NOTIFICATIONS_PREFERENCE_KEY, "true");
        toast.success("Notificações ativadas");
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
        toast.success("Notificações desativadas");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : checked ? "Erro ao ativar notificações" : "Erro ao desativar notificações");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const copyCode = (code: string, groupId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedGroupId(groupId);
    toast.success("Código copiado!");
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
      toast.success("Você saiu do grupo.");
      setLeaveGroupId(null);
    } catch {
      toast.error("Erro ao sair do grupo");
    }
  };

  const inputClass =
    "w-full rounded-[11px] border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary";
  const weeklyGoal = myProfile?.weekly_goal ?? 4;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 px-5 pb-4 pt-4 safe-area-top">
      <div className="flex flex-col gap-1">
        <h1 className="display-title text-[28px] text-foreground">Configurações</h1>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>

      {/* Perfil */}
      <Section label="Perfil">
        {userId && (
          <AvatarUpload userId={userId} currentUrl={avatarUrl} displayName={displayName} onUploaded={(url) => setAvatarUrl(url)} />
        )}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Nome exibido</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loadingProfile || savingProfile}
              placeholder="Seu nome"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={loadingProfile || savingProfile}
            className="self-start rounded-[10px] border border-border bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {savingProfile ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      </Section>

      {/* Meta semanal */}
      <Section label="Meta semanal">
        <p className="text-xs leading-snug text-muted-foreground">Quantos treinos por semana enchem o anel do Início.</p>
        <div className="flex gap-1.5">
          {[3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              disabled={updateWeeklyGoal.isPending}
              onClick={() => updateWeeklyGoal.mutate(n)}
              className={cn(
                "flex-1 rounded-[11px] py-2.5 font-mono text-sm",
                weeklyGoal === n
                  ? "bg-primary font-bold text-primary-foreground"
                  : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>

      {/* Senha */}
      <Section label="Senha">
        <form onSubmit={handleChangePassword} className="flex flex-col gap-2.5">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha"
            disabled={savingPassword}
            minLength={6}
            autoComplete="new-password"
            className={cn(inputClass, "font-mono")}
          />
          <span className="text-[11px] text-muted-foreground/70">Mínimo 6 caracteres.</span>
          <button
            type="submit"
            disabled={savingPassword || !newPassword.trim()}
            className="self-start rounded-[10px] border border-border bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {savingPassword ? "Alterando…" : "Alterar senha"}
          </button>
        </form>
      </Section>

      {/* Notificações */}
      <Section label="Notificações">
        <div className={cn("flex items-center gap-3", !pushSupported && "opacity-50")}>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">Ativar notificações</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {pushSupported ? "Avisos quando alguém registrar um treino." : "Indisponível neste dispositivo."}
            </span>
          </div>
          <Switch
            checked={notifications}
            disabled={notificationsLoading || !pushSupported}
            onCheckedChange={handleNotificationsChange}
            aria-label="Ativar notificações"
          />
        </div>
        <div className={cn("flex items-center gap-3", (!pushSupported || !notifications) && "opacity-50")}>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">Resumo semanal</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {pushSupported ? "Domingo à noite: como fechou a semana no grupo." : "Indisponível neste dispositivo."}
            </span>
          </div>
          <Switch
            checked={weeklySummary && notifications}
            disabled={!pushSupported || !notifications}
            onCheckedChange={handleWeeklySummaryChange}
            aria-label="Resumo semanal"
          />
        </div>
      </Section>

      {/* Tema */}
      <Section label="Tema">
        <div className="flex gap-1.5">
          {(
            [
              ["light", "Claro"],
              ["dark", "Escuro"],
              ["system", "Sistema"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex-1 rounded-[11px] py-[11px] text-xs",
                theme === value
                  ? "bg-primary font-extrabold text-primary-foreground"
                  : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Grupos */}
      <Section label="Grupos">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você não está em nenhum grupo.</p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-[13px] border border-border/60 bg-secondary/40 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-sm font-extrabold text-foreground">{g.name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-[7px] border border-border bg-background px-2 py-1 font-mono text-[11px] font-bold tracking-[0.1em] text-primary">
                    {g.invite_code}
                  </span>
                  <button
                    type="button"
                    aria-label="Copiar código"
                    onClick={() => copyCode(g.invite_code, g.id)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {copiedGroupId === g.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <ShareInviteButton
                    groupName={g.name}
                    inviteCode={g.invite_code}
                    className="text-muted-foreground hover:text-primary"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeaveGroupId(g.id)}
                className="shrink-0 text-xs font-bold text-muted-foreground hover:text-destructive"
              >
                Sair
              </button>
            </div>
          ))
        )}
      </Section>

      {/* Sair */}
      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent p-[15px] text-sm font-bold text-destructive hover:border-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Sair da conta
      </button>

      <p className="pb-4 text-center font-mono text-[10px] text-muted-foreground/60">
        v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}
      </p>

      <AlertDialog open={!!leaveGroupId} onOpenChange={(open) => !open && setLeaveGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Sair do grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você deixará de ver o ranking e a atividade deste grupo. Pode entrar de novo depois com o código.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
