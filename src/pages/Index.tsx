import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNowStrict, isSameDay, startOfDay, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMyGroups, useCreateGroup, useJoinGroupByCode } from "@/hooks/useGroups";
import { useGroupWorkouts, useDeleteWorkout } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { useWorkoutLikes, useToggleWorkoutLike } from "@/hooks/useWorkoutLikes";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useChallenges } from "@/hooks/useChallenges";
import { useWorkoutPhotoUrls } from "@/hooks/useWorkoutPhotos";
import { challengeStatus, daysLeft, computeChallengeScores } from "@/lib/challenges";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { useImportWorkouts } from "@/hooks/useImportWorkouts";
import { useRegisterWorkout } from "@/contexts/RegisterWorkoutContext";
import { filterWorkoutsByPeriod, computeRanking, computeStreak, buildCallout } from "@/lib/ranking";
import { exportWorkoutsToJSON } from "@/lib/export-workouts";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { errorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { InitialAvatar } from "@/components/InitialAvatar";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader } from "@/components/PageLoader";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { JoinGroupDialog } from "@/components/JoinGroupDialog";
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
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Flame,
  Plus,
  Shield,
  Trash2,
  Trophy,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const FEED_PAGE_SIZE = 10;

/** Anel da meta semanal (SVG do protótipo, circunferência 283). */
function GoalRing({ done, goal }: { done: number; goal: number }) {
  const offset = 283 * (1 - Math.min(1, done / Math.max(1, goal)));
  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width="52" height="52" viewBox="0 0 100 100" className="block">
        <circle cx="50" cy="50" r="45" fill="none" className="stroke-border" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className="animate-ring-draw stroke-primary"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="font-mono text-[9px] font-semibold tracking-[0.1em] text-muted-foreground">
        {done}/{goal} SEM
      </span>
    </div>
  );
}

export default function Index() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { openRegister, openRegisterForDate } = useRegisterWorkout();
  const userId = user?.id;
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(userId);
  const { data: myProfile } = useMyProfile(userId);
  const createGroup = useCreateGroup(userId);
  const joinGroup = useJoinGroupByCode(userId);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null,
  );

  const selectedGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(selectedGroup?.id);
  const { data: challenges = [] } = useChallenges(selectedGroup?.id);
  const { data: likesMap = {} } = useWorkoutLikes(selectedGroup?.id, userId);
  const toggleLike = useToggleWorkoutLike(selectedGroup?.id, userId);
  const deleteWorkout = useDeleteWorkout();
  const importWorkouts = useImportWorkouts(userId, selectedGroup?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workoutToDelete, setWorkoutToDelete] = useState<{ id: string; group_id: string; label: string } | null>(null);
  const [feedPage, setFeedPage] = useState(1);

  const displayName = myProfile?.display_name || user?.user_metadata?.display_name || user?.email || "?";
  const myWorkouts = useMemo(() => workouts.filter((w) => w.user_id === userId), [workouts, userId]);

  const weeklyRanking = useMemo(
    () => computeRanking(filterWorkoutsByPeriod(workouts, "week"), profilesMap),
    [workouts, profilesMap],
  );
  const callout = buildCallout(weeklyRanking, userId);
  const streak = useMemo(() => computeStreak(myWorkouts.map((w) => w.workout_date)), [myWorkouts]);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const trainedOn = (d: Date) => myWorkouts.some((w) => isSameDay(new Date(w.workout_date), d));
  const weekDoneDays = weekDays.filter((d) => trainedOn(d)).length;
  const weeklyGoal = myProfile?.weekly_goal ?? 4;
  const trainedToday = trainedOn(today);

  const feedTotalPages = Math.max(1, Math.ceil(workouts.length / FEED_PAGE_SIZE));
  const feedPaginated = workouts.slice((feedPage - 1) * FEED_PAGE_SIZE, feedPage * FEED_PAGE_SIZE);

  // Fotos-prova da página atual do feed
  const feedPhotoPaths = useMemo(() => feedPaginated.filter((w) => w.photo_url).map((w) => w.photo_url!), [feedPaginated]);
  const { data: photoUrls = {} } = useWorkoutPhotoUrls(feedPhotoPaths);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const feedLightboxPhotos = useMemo(
    () =>
      feedPaginated
        .filter((w) => w.photo_url)
        .map((w) => ({
          id: w.id,
          url: photoUrls[w.photo_url!] ?? null,
          title: w.user_id === userId ? "Você" : (profilesMap[w.user_id]?.display_name ?? "Alguém"),
          subtitle: w.workout_type,
        })),
    [feedPaginated, photoUrls, profilesMap, userId],
  );

  // Desafio ativo mais urgente (menos dias restantes) para o banner
  const activeChallenge = challenges
    .filter((c) => challengeStatus(c) === "active")
    .sort((a, b) => daysLeft(a) - daysLeft(b))[0];
  const activeChallengeScores = activeChallenge
    ? computeChallengeScores(
        activeChallenge,
        activeChallenge.challenge_participants.map((p) => p.user_id),
        workouts,
        profilesMap,
      )
    : [];
  const myChallengeScore = activeChallengeScores.find((s) => s.user_id === userId);

  const setSelectedGroup = (id: string) => {
    localStorage.setItem(GROUPS_STORAGE_KEY, id);
    setActiveGroupId(id);
    setGroupMenuOpen(false);
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteWorkout = async () => {
    if (!workoutToDelete) return;
    try {
      await deleteWorkout.mutateAsync({ workout_id: workoutToDelete.id, group_id: workoutToDelete.group_id });
      toast.success("Treino excluído.");
      setWorkoutToDelete(null);
    } catch {
      toast.error("Erro ao excluir treino");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importWorkouts.mutateAsync(file);
      toast.success(`${count} treinos importados com sucesso!`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao importar treinos."));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loadingGroups) return <PageLoader />;

  // ── Onboarding: sem nenhum grupo ─────────────────────────────────────────
  if (groups.length === 0) {
    const handleJoin = async () => {
      const code = inviteCode.trim().toUpperCase();
      if (!code) return;
      try {
        await joinGroup.mutateAsync(code);
        toast.success("Você entrou no grupo!");
      } catch (err) {
        toast.error(errorMessage(err, "Código inválido."));
      }
    };

    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center overflow-hidden bg-background px-7 safe-area-top safe-area-bottom">
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-[360px] w-[360px] animate-glow-pulse rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.16),transparent_65%)] [animation-duration:5s]" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-primary/15 text-primary">
              <Users className="h-7 w-7" />
            </span>
            <h1 className="display-title text-[32px] leading-[1.05]">
              Treinar sozinho
              <br />é mais fácil de largar
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Entre num grupo pra disputar a semana com seus amigos — ou crie o seu e chame a galera.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary p-[18px] text-[15px] font-extrabold text-primary-foreground shadow-hard active-hard"
            >
              <Plus className="h-5 w-5" />
              Criar um grupo
            </button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60">OU</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="invite" className="mono-label">
                Código de convite
              </label>
              <input
                id="invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                className="w-full rounded-xl border border-border bg-card p-4 text-center font-mono text-xl font-bold uppercase tracking-[0.35em] text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinGroup.isPending || !inviteCode.trim()}
              className="w-full rounded-[14px] border border-border bg-secondary p-4 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {joinGroup.isPending ? "Entrando…" : "Entrar no grupo"}
            </button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground/50">
            Você pode estar em vários grupos ao mesmo tempo. Cada treino conta para todos.
          </p>

          <div className="flex items-center justify-center gap-4">
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            <button type="button" onClick={signOut} className="text-xs font-semibold text-muted-foreground hover:text-destructive">
              Sair da conta
            </button>
          </div>
        </div>

        <CreateGroupDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={async (name) => (await createGroup.mutateAsync(name)) ?? null}
          isCreating={createGroup.isPending}
        />
      </div>
    );
  }

  // ── Início ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-4 pt-4 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="display-title text-[26px] leading-none text-foreground">
            Fit<span className="text-primary">rank</span>
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {format(new Date(), "EEEE · dd MMM", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Painel admin"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:text-primary"
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setGroupMenuOpen((v) => !v)}
              className="flex h-[38px] max-w-[150px] items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-xs font-bold text-foreground hover:border-primary"
            >
              <span className="truncate">{selectedGroup?.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            {groupMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setGroupMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-1.5 flex w-56 flex-col gap-0.5 rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-pop-in">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroup(g.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                        g.id === selectedGroup?.id
                          ? "bg-primary/10 font-bold text-primary"
                          : "font-semibold text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="truncate">{g.name}</span>
                      {g.id === selectedGroup?.id && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  ))}
                  <div className="mx-1.5 my-0.5 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setGroupMenuOpen(false);
                      setCreateOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Criar grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupMenuOpen(false);
                      setJoinOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Entrar com código
                  </button>
                </div>
              </>
            )}
          </div>
          <Link to="/settings" aria-label="Configurações">
            <InitialAvatar name={displayName} avatarUrl={myProfile?.avatar_url} isSelf className="h-[38px] w-[38px] text-sm" />
          </Link>
        </div>
      </div>

      {/* Streak + meta semanal */}
      <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-[18px] animate-rise-in">
        <div className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(120px_80px_at_12%_50%,hsl(var(--accent)/0.22),transparent_70%)]" />
        <div className="relative flex items-baseline gap-1.5">
          <Flame className="h-[30px] w-[30px] animate-flame self-center fill-accent/20 text-accent" />
          <span className="font-mono text-[46px] font-bold leading-[0.85] tabular-nums text-foreground">{streak}</span>
        </div>
        <div className="relative flex flex-1 flex-col gap-0.5">
          <span className="text-sm font-extrabold text-foreground">{streak === 1 ? "dia seguido" : "dias seguidos"}</span>
          <span className="text-xs leading-snug text-muted-foreground">
            {trainedToday ? "Treino de hoje já está no placar." : "Treine hoje para manter a sequência."}
          </span>
        </div>
        <div className="relative">
          <GoalRing done={weekDoneDays} goal={weeklyGoal} />
        </div>
      </div>

      {/* Desafio ativo */}
      {activeChallenge && (
        <Link
          to="/rankings"
          className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-secondary to-card p-3.5 animate-rise-in"
        >
          <span className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(160px_80px_at_90%_50%,hsl(var(--accent)/0.16),transparent_70%)] [animation-duration:4s]" />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 text-xl">
            {activeChallenge.emoji}
          </span>
          <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-extrabold text-foreground">{activeChallenge.title}</span>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {myChallengeScore
                ? `${myChallengeScore.position}º · ${myChallengeScore.count} ${myChallengeScore.count === 1 ? "treino" : "treinos"}`
                : "Você está fora — entre e dispute"}
            </span>
          </span>
          <span
            className={cn(
              "relative shrink-0 rounded-lg px-2 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em]",
              daysLeft(activeChallenge) === 1
                ? "animate-glow-pulse bg-accent text-accent-foreground [animation-duration:1.6s]"
                : "bg-accent/15 text-accent",
            )}
          >
            {daysLeft(activeChallenge) === 1 ? "ÚLTIMO DIA" : `${daysLeft(activeChallenge)} DIAS`}
          </span>
        </Link>
      )}

      {/* Faixa dos 7 dias */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d, i) => {
          const done = trainedOn(d);
          const isToday = isSameDay(d, today);
          const future = d > today;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {format(d, "EEEEEE", { locale: ptBR })}
              </span>
              <div
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-[10px] border font-mono text-[13px] font-bold animate-pop-in",
                  done
                    ? "border-transparent bg-primary text-primary-foreground"
                    : isToday
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  future && !isToday && "opacity-45",
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking da semana */}
      <div className="overflow-hidden rounded-[18px] border border-border bg-card">
        <div className="flex flex-col gap-1.5 bg-gradient-to-b from-secondary/60 to-transparent px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="display-title text-[17px] text-foreground">Ranking da semana</span>
            <span className="rounded-md bg-primary/15 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.12em] text-primary">
              SEG–DOM
            </span>
          </div>
          {callout && <span className="text-[13px] font-semibold leading-snug text-accent">{callout}</span>}
        </div>
        {weeklyRanking.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState
              icon={Trophy}
              title="Nenhum treino esta semana"
              description="O ranking zera toda segunda. Seja o primeiro a marcar."
              className="border-none bg-transparent py-4"
            />
          </div>
        ) : (
          <div className="flex flex-col">
            {weeklyRanking.slice(0, 6).map((entry) => {
              const isMe = entry.user_id === userId;
              const maxCount = Math.max(1, weeklyRanking[0]?.count ?? 1);
              const isFirst = entry.position === 1;
              return (
                <div
                  key={entry.user_id}
                  className={cn("flex items-center gap-3 border-t border-border/60 px-4 py-[11px]", isMe && "bg-primary/5")}
                >
                  <span
                    className={cn(
                      "flex h-[26px] min-w-[26px] items-center justify-center rounded-[7px] font-mono text-[13px] font-bold",
                      isFirst ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {entry.position}
                  </span>
                  <InitialAvatar
                    name={entry.display_name}
                    avatarUrl={entry.avatar_url}
                    isSelf={isMe}
                    className="h-[30px] w-[30px] rounded-[9px] text-xs"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm font-bold", isMe ? "text-primary" : "text-foreground")}>
                        {isMe ? "Você" : entry.display_name}
                      </span>
                      <span className={cn("font-mono text-[13px] font-bold tabular-nums", isFirst ? "text-primary" : "text-muted-foreground")}>
                        {entry.count}
                      </span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-[3px] bg-secondary">
                      <div
                        className={cn("h-full origin-left animate-bar-in rounded-[3px]", isFirst ? "bg-primary" : "bg-muted-foreground/40")}
                        style={{ width: `${(entry.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link
          to="/rankings"
          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-secondary/50 py-[13px] font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary hover:bg-secondary"
        >
          Ranking completo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Calendário heatmap */}
      <WorkoutCalendar
        workouts={myWorkouts}
        onEmptyDaySelect={openRegisterForDate}
        onDeleteWorkout={(w) => setWorkoutToDelete(w)}
        isDeleting={deleteWorkout.isPending}
      />

      {/* Abas */}
      <Tabs defaultValue="feed" onValueChange={() => setFeedPage(1)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-[3px] rounded-xl border border-border bg-card p-[3px]">
          {[
            ["feed", "Atividade"],
            ["my", "Histórico"],
            ["members", "Membros"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-[9px] py-[9px] text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:font-extrabold data-[state=active]:text-primary-foreground"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="feed" className="mt-3">
          {workouts.length === 0 ? (
            <EmptyState icon={Zap} title="Nenhum treino ainda" description="O primeiro registro do grupo inaugura o feed." />
          ) : (
            <div className="flex flex-col gap-2">
              {feedPaginated.map((w) => {
                const profile = profilesMap[w.user_id];
                const like = likesMap[w.id];
                const isMine = w.user_id === userId;
                return (
                  <div key={w.id} className="flex gap-3 rounded-[14px] border border-border/60 bg-card p-[13px] hover:border-border">
                    <InitialAvatar
                      name={profile?.display_name ?? "?"}
                      avatarUrl={profile?.avatar_url}
                      isSelf={isMine}
                      className="h-[34px] w-[34px] text-[13px]"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-extrabold text-foreground">
                          {isMine ? "Você" : (profile?.display_name ?? "Alguém")}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground/70">
                          {formatDistanceToNowStrict(new Date(w.workout_date), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {w.workout_type.split(", ").map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      {w.notes && <span className="text-xs leading-snug text-muted-foreground">{w.notes}</span>}
                      {w.photo_url && photoUrls[w.photo_url] && (
                        <button
                          type="button"
                          aria-label="Ampliar foto do treino"
                          onClick={() => {
                            const idx = feedLightboxPhotos.findIndex((p) => p.id === w.id);
                            if (idx >= 0) setLightboxIdx(idx);
                          }}
                          className="mt-1 overflow-hidden rounded-xl border border-border"
                        >
                          <img
                            src={photoUrls[w.photo_url]}
                            alt="Foto do treino"
                            loading="lazy"
                            className="max-h-56 w-full object-cover"
                          />
                        </button>
                      )}
                      <div className="mt-0.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={toggleLike.isPending}
                          onClick={() => toggleLike.mutate({ workout_id: w.id, liked: !!like?.likedByMe })}
                          className={cn(
                            "flex items-center gap-1 rounded-lg border px-2 py-[5px] font-mono text-[11px] font-bold transition-colors",
                            like?.likedByMe
                              ? "border-accent/40 bg-accent/15 text-accent"
                              : "border-border text-muted-foreground hover:border-accent hover:text-accent",
                          )}
                        >
                          <Zap className={cn("h-3.5 w-3.5", like?.likedByMe && "fill-current")} />
                          {like?.count ?? 0}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {feedTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                    disabled={feedPage <= 1}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {feedPage}/{feedTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFeedPage((p) => Math.min(feedTotalPages, p + 1))}
                    disabled={feedPage >= feedTotalPages}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-3">
          {myWorkouts.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="Nenhum treino seu ainda"
              description="Toque no + para registrar — ou num dia do calendário para registro retroativo."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {myWorkouts.slice(0, 20).map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card p-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-bold text-foreground">{w.workout_type}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {format(new Date(w.workout_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Excluir treino"
                    disabled={deleteWorkout.isPending}
                    onClick={() => setWorkoutToDelete({ id: w.id, group_id: w.group_id, label: w.workout_type })}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => exportWorkoutsToJSON(myWorkouts, displayName)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-3 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </button>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importWorkouts.isPending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-3 text-xs font-bold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {importWorkouts.isPending ? "Importando…" : "Importar"}
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-3">
          {Object.keys(profilesMap).length === 0 ? (
            <EmptyState icon={Users} title="Nenhum membro encontrado" />
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(profilesMap).map(([uid, profile]) => (
                <div key={uid} className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card p-3">
                  <InitialAvatar
                    name={profile.display_name}
                    avatarUrl={profile.avatar_url}
                    isSelf={uid === userId}
                    className="h-9 w-9 text-sm"
                  />
                  <span className="text-sm font-bold text-foreground">
                    {uid === userId ? `${profile.display_name} (você)` : profile.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Código de convite */}
      {selectedGroup && (
        <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs text-muted-foreground">Convide para {selectedGroup.name}</p>
            <code className="font-mono text-base font-bold tracking-[0.15em] text-primary">{selectedGroup.invite_code}</code>
          </div>
          <button
            type="button"
            aria-label="Copiar código de convite"
            onClick={() => copyInviteCode(selectedGroup.invite_code)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={feedLightboxPhotos}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (name) => (await createGroup.mutateAsync(name)) ?? null}
        isCreating={createGroup.isPending}
      />
      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoin={async (code) => (await joinGroup.mutateAsync(code)) ?? null}
        isJoining={joinGroup.isPending}
      />
      <AlertDialog open={!!workoutToDelete} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {workoutToDelete && (
                <>O treino &quot;{workoutToDelete.label}&quot; será excluído de todos os grupos. Isso não pode ser desfeito.</>
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
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              {deleteWorkout.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
