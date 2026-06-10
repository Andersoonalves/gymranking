import { useState, useRef } from "react";
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
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
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
  Download,
  Upload,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { exportWorkoutsToJSON } from "@/lib/export-workouts";
import { useImportWorkouts } from "@/hooks/useImportWorkouts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FEED_PAGE_SIZE = 10;

export default function Index() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const { openRegister, openRegisterForDate } = useRegisterWorkout();
  const userId = user?.id;
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(userId);
  const createGroup = useCreateGroup(userId);
  const joinGroup = useJoinGroupByCode(userId);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null)
  );

  const selectedGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);
  const deleteWorkout = useDeleteWorkout();
  const importWorkouts = useImportWorkouts(userId, selectedGroup?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workoutToDelete, setWorkoutToDelete] = useState<{ id: string; group_id: string; label: string } | null>(null);
  const [feedPage, setFeedPage] = useState(1);

  const setSelectedGroup = (id: string) => {
    localStorage.setItem(GROUPS_STORAGE_KEY, id);
    setActiveGroupId(id);
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importWorkouts.mutateAsync(file);
      toast({ title: `${count} treinos importados com sucesso!` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao importar treinos.";
      toast({ title: message, variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const weeklyWorkouts = filterWorkoutsByPeriod(workouts, "week");
  const weeklyRanking = computeRanking(weeklyWorkouts, profilesMap);
  const feedTotalPages = Math.max(1, Math.ceil(workouts.length / FEED_PAGE_SIZE));
  const feedPaginated = workouts.slice(
    (feedPage - 1) * FEED_PAGE_SIZE,
    feedPage * FEED_PAGE_SIZE
  );
  const myWorkouts = workouts.filter((w) => w.user_id === userId);

  if (loadingGroups) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasGroups = groups.length > 0;

  if (!hasGroups) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">FitRank</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.display_name || user?.email}!
            </p>
          </div>
          <Card className="text-left">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Comece com um grupo
              </CardTitle>
              <CardDescription>
                Crie um grupo e compartilhe o código com amigos, ou entre em um existente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setCreateOpen(true)}
                disabled={createGroup.isPending}
              >
                <PlusCircle className="h-5 w-5" />
                Criar grupo
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                size="lg"
                onClick={() => setJoinOpen(true)}
                disabled={joinGroup.isPending}
              >
                <LogIn className="h-5 w-5" />
                Entrar com código
              </Button>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            {isAdmin && (
              <Button variant="ghost" asChild className="gap-2 text-muted-foreground">
                <Link to="/admin">
                  <Shield className="h-4 w-4" />
                  Painel Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" onClick={signOut} className="gap-2 text-muted-foreground">
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
    <div className="mx-auto max-w-lg px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">FitRank</h1>
          <p className="text-xs text-muted-foreground truncate">
            {user?.user_metadata?.display_name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild className="h-9 w-9">
              <Link to="/admin">
                <Shield className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCreateOpen(true)} className="h-9 w-9">
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setJoinOpen(true)} className="h-9 w-9">
            <LogIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroup(g.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedGroup?.id === g.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {selectedGroup && (
        <>
          {/* Weekly ranking */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ranking da semana</CardTitle>
                <Link to="/rankings" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver tudo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="text-xs">Quem mais treinou esta semana</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {weeklyRanking.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum treino esta semana.</p>
              ) : (
                <div className="space-y-3">
                  {weeklyRanking.slice(0, 5).map((entry) => {
                    const medal = getMedalEmoji(entry.position);
                    const maxCount = Math.max(1, weeklyRanking[0]?.count ?? 1);
                    return (
                      <div key={entry.user_id} className="flex items-center gap-3">
                        <span className="w-6 text-center text-lg">{medal ?? `#${entry.position}`}</span>
                        <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                          {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt={entry.display_name} />}
                          <AvatarFallback className="text-xs font-semibold">{entry.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.display_name}</p>
                          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${(entry.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-primary">{entry.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="feed" onValueChange={() => setFeedPage(1)}>
                <div className="border-b px-4 pt-4">
                  <TabsList className="grid w-full grid-cols-3 h-9">
                    <TabsTrigger value="feed" className="text-xs">Atividade</TabsTrigger>
                    <TabsTrigger value="my" className="text-xs">Histórico</TabsTrigger>
                    <TabsTrigger value="members" className="text-xs">Membros</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="feed" className="p-4 pt-3">
                  {workouts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum treino ainda.</p>
                  ) : (
                    <>
                      <ul className="space-y-1">
                        {feedPaginated.map((w) => (
                          <li key={w.id} className="flex items-center gap-3 rounded-lg py-2.5 px-1 transition-colors hover:bg-muted/50">
                            <Avatar className="h-8 w-8 shrink-0">
                              {profilesMap[w.user_id]?.avatar_url && <AvatarImage src={profilesMap[w.user_id].avatar_url!} alt={profilesMap[w.user_id]?.display_name} />}
                              <AvatarFallback className="text-xs">{(profilesMap[w.user_id]?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-medium">{profilesMap[w.user_id]?.display_name ?? "Alguém"}</span>
                                <span className="text-muted-foreground"> — {w.workout_type}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(w.workout_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
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
                      {feedTotalPages > 1 && (
                        <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                            disabled={feedPage <= 1}
                          >
                            Anterior
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {feedPage}/{feedTotalPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFeedPage((p) => Math.min(feedTotalPages, p + 1))}
                            disabled={feedPage >= feedTotalPages}
                          >
                            Próxima
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="my" className="p-4 pt-3">
                  <div className="space-y-4">
                    {myWorkouts.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Toque em um dia no calendário para registrar.
                      </p>
                    )}
                    <WorkoutCalendar
                      workouts={myWorkouts}
                      onEmptyDaySelect={openRegisterForDate}
                      onDeleteWorkout={selectedGroup ? (w) => setWorkoutToDelete(w) : undefined}
                      isDeleting={deleteWorkout.isPending}
                    />
                    <div className="flex gap-2">
                      {myWorkouts.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => exportWorkoutsToJSON(myWorkouts, user?.user_metadata?.display_name || user?.email)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Exportar
                        </Button>
                      )}
                      <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleImport}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importWorkouts.isPending}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {importWorkouts.isPending ? "Importando…" : "Importar"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="p-4 pt-3">
                  {Object.keys(profilesMap).length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {Object.entries(profilesMap).map(([uid, profile]) => (
                        <li key={uid} className="flex items-center gap-3 rounded-lg py-2 px-1">
                          <Avatar className="h-9 w-9">
                            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                            <AvatarFallback className="text-xs font-semibold">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{profile.display_name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Group info + register */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <Button className="w-full gap-2" size="lg" onClick={openRegister}>
                <Dumbbell className="h-5 w-5" />
                Registrar treino
              </Button>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">{selectedGroup.name}</p>
                  <code className="font-mono text-base font-bold tracking-widest text-foreground">
                    {selectedGroup.invite_code}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
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
