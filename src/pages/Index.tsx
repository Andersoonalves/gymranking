import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  useMyGroups,
  useCreateGroup,
  useJoinGroupByCode,
} from "@/hooks/useGroups";
import { useGroupWorkouts, useDeleteWorkout } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { useRegisterWorkout } from "@/contexts/RegisterWorkoutContext";
import {
  filterWorkoutsByPeriod,
  computeRanking,
  getMedalEmoji,
} from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { JoinGroupDialog } from "@/components/JoinGroupDialog";
import {
  Dumbbell,
  Shield,
  Users,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Index() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const { openRegister } = useRegisterWorkout();
  const userId = user?.id;
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(userId);
  const createGroup = useCreateGroup(userId);
  const joinGroup = useJoinGroupByCode(userId);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedGroupId =
    typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);
  const deleteWorkout = useDeleteWorkout();

  const [workoutToDelete, setWorkoutToDelete] = useState<{ id: string; group_id: string; label: string } | null>(null);

  const setSelectedGroup = (id: string) => {
    localStorage.setItem(GROUPS_STORAGE_KEY, id);
    setCopiedId(null);
  };

  const copyInviteCode = (code: string, groupId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(groupId);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (name: string) => {
    const result = await createGroup.mutateAsync(name);
    return result ?? null;
  };

  const handleJoin = async (code: string) => {
    const result = await joinGroup.mutateAsync(code);
    return result ?? null;
  };

  const handleDeleteWorkout = async () => {
    if (!workoutToDelete) return;
    try {
      await deleteWorkout.mutateAsync({
        workout_id: workoutToDelete.id,
        group_id: workoutToDelete.group_id,
      });
      toast({ title: "Treino excluído." });
      setWorkoutToDelete(null);
    } catch {
      toast({ title: "Erro ao excluir treino", variant: "destructive" });
    }
  };

  const weeklyWorkouts = filterWorkoutsByPeriod(workouts, "week");
  const weeklyRanking = computeRanking(weeklyWorkouts, profilesMap);
  const recentFeed = workouts.slice(0, 15);

  if (loadingGroups) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasGroups = groups.length > 0;

  if (!hasGroups) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FitRank</h1>
            <p className="mt-2 text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.display_name || user?.email}!
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Comece com um grupo
              </CardTitle>
              <CardDescription>
                Crie um grupo e compartilhe o código com amigos, ou entre em um grupo existente com o código que receber.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                className="w-full gap-2"
                onClick={() => setCreateOpen(true)}
                disabled={createGroup.isPending}
              >
                <PlusCircle className="h-4 w-4" />
                Criar grupo
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setJoinOpen(true)}
                disabled={joinGroup.isPending}
              >
                <LogIn className="h-4 w-4" />
                Entrar com código
              </Button>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3">
            {isAdmin && (
              <Button variant="outline" asChild className="gap-2">
                <Link to="/admin">
                  <Shield className="h-4 w-4" />
                  Painel Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" onClick={signOut} className="gap-2">
              Sair
            </Button>
          </div>
        </div>
        <CreateGroupDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={handleCreate}
          isCreating={createGroup.isPending}
        />
        <JoinGroupDialog
          open={joinOpen}
          onOpenChange={setJoinOpen}
          onJoin={handleJoin}
          isJoining={joinGroup.isPending}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FitRank</h1>
          <p className="text-sm text-muted-foreground">
            {user?.user_metadata?.display_name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Criar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            Entrar
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <Shield className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <Button
              key={g.id}
              variant={selectedGroup?.id === g.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGroup(g.id)}
            >
              {g.name}
            </Button>
          ))}
        </div>
      )}

      {selectedGroup && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Ranking da semana</CardTitle>
              <CardDescription>Quem mais treinou esta semana (segunda a domingo)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum treino registrado esta semana.</p>
              ) : (
                weeklyRanking.slice(0, 5).map((entry) => {
                  const medal = getMedalEmoji(entry.position);
                  const maxCount = Math.max(1, weeklyRanking[0]?.count ?? 1);
                  return (
                    <div key={entry.user_id} className="flex items-center gap-3">
                      <span className="w-6 text-lg">{medal ?? `#${entry.position}`}</span>
                      <Avatar className="h-7 w-7">
                        {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt={entry.display_name} />}
                        <AvatarFallback className="text-xs">{entry.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.display_name}</p>
                        <div className="h-2 rounded-full bg-muted overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(entry.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{entry.count} treinos</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>Quem treinou o quê no grupo</CardDescription>
            </CardHeader>
            <CardContent>
              {recentFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum treino ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {recentFeed.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span className="min-w-0 flex-1 flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          {profilesMap[w.user_id]?.avatar_url && <AvatarImage src={profilesMap[w.user_id].avatar_url!} alt={profilesMap[w.user_id]?.display_name} />}
                          <AvatarFallback className="text-xs">{(profilesMap[w.user_id]?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span><strong>{profilesMap[w.user_id]?.display_name ?? "Alguém"}</strong> — {w.workout_type}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(w.workout_date), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      {w.user_id === userId && selectedGroup && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setWorkoutToDelete({ id: w.id, group_id: w.group_id, label: w.workout_type })}
                          disabled={deleteWorkout.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedGroup.name}
              </CardTitle>
              <CardDescription>Código para convidar amigos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full gap-2" size="lg" onClick={openRegister}>
                <Dumbbell className="h-5 w-5" />
                Registrar treino
              </Button>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
                <code className="flex-1 text-center font-mono text-lg font-semibold tracking-widest text-foreground">
                  {selectedGroup.invite_code}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyInviteCode(selectedGroup.invite_code, selectedGroup.id)}
                >
                  {copiedId === selectedGroup.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isCreating={createGroup.isPending}
      />
      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoin={handleJoin}
        isJoining={joinGroup.isPending}
      />
      <AlertDialog open={!!workoutToDelete} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {workoutToDelete && (
                <>O treino &quot;{workoutToDelete.label}&quot; será excluído. Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteWorkout();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkout.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
