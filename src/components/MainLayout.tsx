import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups, useCreateGroup, useJoinGroupByCode } from "@/hooks/useGroups";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useActiveGroupId } from "@/hooks/useActiveGroup";
import { BrandMark } from "@/components/BrandMark";
import { InitialAvatar } from "@/components/InitialAvatar";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { JoinGroupDialog } from "@/components/JoinGroupDialog";
import { useAddWorkout, useGroupWorkouts } from "@/hooks/useWorkouts";
import { useProfilesInGroup } from "@/hooks/useProfilesInGroup";
import { useBodyProgress } from "@/hooks/useBodyProgress";
import { computeRanking, filterWorkoutsByPeriod, formatPeriodCountdown } from "@/lib/ranking";
import { EXERCISES_BY_MUSCLE_GROUP } from "@/lib/exercises";
import { NEW_WEIGHT_EVENT } from "@/lib/constants";
import { RegisterWorkoutProvider } from "@/contexts/RegisterWorkoutContext";
import { RegisterWorkoutSheet } from "@/components/RegisterWorkoutSheet";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewWorkout } from "@/lib/push";
import { enqueueWorkout, isNetworkError } from "@/lib/offline-queue";
import { useOfflineWorkoutSync } from "@/hooks/useOfflineWorkoutSync";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowUp, Check, ChevronsUpDown, Home, Trophy, Plus, ClipboardList, Scale, TrendingUp, Settings } from "lucide-react";

const navItems = [
  { path: "/", label: "Início", icon: Home },
  { path: "/rankings", label: "Rankings", icon: Trophy },
  { path: "/register", label: "", icon: Plus, isAction: true },
  { path: "/treinos", label: "Treinos", icon: ClipboardList },
  { path: "/progresso", label: "Progresso", icon: TrendingUp },
];

const LIBRARY_SIZE = Object.values(EXERCISES_BY_MUSCLE_GROUP).reduce((acc, list) => acc + list.length, 0);

type MainLayoutProps = { children: React.ReactNode };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const { data: myProfile } = useMyProfile(userId);
  const addWorkout = useAddWorkout(userId);
  const createGroup = useCreateGroup(userId);
  const joinGroup = useJoinGroupByCode(userId);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerTargetDate, setRegisterTargetDate] = useState<Date | null>(null);
  const [activeGroupId, setActiveGroupId] = useActiveGroupId();
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  // Cada tela tem seu card no pé da sidebar (como no protótipo)
  const { data: groupWorkouts = [] } = useGroupWorkouts(activeGroup?.id);
  const { data: profilesMap = {} } = useProfilesInGroup(activeGroup?.id);
  const { data: weighIns = [] } = useBodyProgress(userId);

  const myWeekEntry = useMemo(() => {
    const weekly = computeRanking(filterWorkoutsByPeriod(groupWorkouts, "week"), profilesMap);
    return weekly.find((e) => e.user_id === userId);
  }, [groupWorkouts, profilesMap, userId]);

  const weightSince = weighIns[0];
  const weightLatest = weighIns[weighIns.length - 1];
  const weightDelta = weightSince && weightLatest ? weightLatest.weight_kg - weightSince.weight_kg : 0;

  useOfflineWorkoutSync(userId);

  // Troca de aba volta o scroll pro topo — sem isso a nova tela abre no meio.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Botão "voltar ao topo" aparece depois de rolar uma tela.
  // Captura pega o scroll onde quer que ele aconteça (window ou container).
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400 || (mainRef.current?.scrollTop ?? 0) > 400);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  const allGroupIds = groups.map((g) => g.id);

  const handleRegister = async (params: {
    workout_types: string[];
    workout_date: string;
    notes?: string | null;
    photo_url?: string | null;
  }) => {
    try {
      await addWorkout.mutateAsync(params);
    } catch (err) {
      // Sem conexão: guarda na fila e segue — sincroniza sozinho quando a rede voltar.
      if (isNetworkError(err)) {
        enqueueWorkout({
          workout_types: params.workout_types,
          workout_date: params.workout_date,
          notes: params.notes ?? null,
          photo_url: params.photo_url ?? null,
        });
        toast.info("Sem conexão — treino guardado.", {
          description: "Ele entra no placar sozinho quando a internet voltar.",
        });
        return;
      }
      throw err;
    }
    if (session?.access_token && allGroupIds.length > 0) {
      const displayName =
        (await supabase.from("profiles").select("display_name").eq("user_id", userId).single()).data?.display_name ??
        user?.email ??
        "Alguém";
      for (const group of groups) {
        notifyNewWorkout(supabaseUrl, anonKey, session.access_token, {
          group_id: group.id,
          group_name: group.name,
          display_name: displayName,
          workout_type: params.workout_types.join(", "),
        }).catch(() => { });
      }
    }
  };

  const handleNav = (item: (typeof navItems)[0]) => {
    if (item.isAction) {
      setRegisterOpen(true);
      return;
    }
    navigate(item.path);
  };

  return (
    <RegisterWorkoutProvider
      open={registerOpen}
      setOpen={setRegisterOpen}
      registerTargetDate={registerTargetDate}
      setRegisterTargetDate={setRegisterTargetDate}
    >
      <div className="flex min-h-dvh flex-col bg-background lg:pl-[248px]">
        {/* Sidebar fixa — só desktop; no mobile a navegação é a barra inferior */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col gap-6 border-r border-border bg-card px-4 py-6 lg:flex">
          <div className="flex items-center gap-2.5 px-1.5">
            <BrandMark className="h-[30px] w-[30px] shrink-0" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="display-title text-2xl leading-none text-foreground">
                Fit<span className="text-primary">rank</span>
              </span>
              <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {format(new Date(), "EEEE · dd MMM", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Seletor de grupo ativo — sincroniza com as páginas via useActiveGroupId */}
          {activeGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setGroupMenuOpen((v) => !v)}
                className="flex h-11 w-full items-center gap-2.5 rounded-[11px] border border-border bg-secondary/60 px-3 text-[13px] font-bold text-foreground hover:border-primary"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-accent to-primary font-sans text-[11px] font-extrabold text-background">
                  {activeGroup.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{activeGroup.name}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              {groupMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setGroupMenuOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 flex flex-col gap-0.5 rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-pop-in">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setActiveGroupId(g.id);
                          setGroupMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                          g.id === activeGroup.id
                            ? "bg-primary/10 font-bold text-primary"
                            : "font-semibold text-foreground hover:bg-secondary",
                        )}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.id === activeGroup.id && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                    <div className="mx-1.5 my-0.5 h-px bg-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMenuOpen(false);
                        setCreateGroupOpen(true);
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
                        setJoinGroupOpen(true);
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
          )}

          <div className="flex flex-col gap-1">
            {[...navItems.filter((i) => !i.isAction), { path: "/settings", label: "Ajustes", icon: Settings }].map(
              (item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex h-[42px] items-center gap-3 rounded-[11px] px-3 text-[13px]",
                      isActive
                        ? "bg-primary/10 font-extrabold text-primary"
                        : "font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </button>
                );
              },
            )}
          </div>

          {/* No Progresso o CTA vira "Registrar peso" e abre o formulário da página */}
          {location.pathname === "/progresso" ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(NEW_WEIGHT_EVENT))}
              className="flex h-12 items-center justify-center gap-2 rounded-[13px] bg-primary text-sm font-extrabold text-primary-foreground shadow-hard active-hard"
            >
              <Scale className="h-[21px] w-[21px]" strokeWidth={2.5} />
              Registrar peso
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-[13px] bg-primary text-sm font-extrabold text-primary-foreground shadow-hard active-hard"
            >
              <Plus className="h-[22px] w-[22px]" strokeWidth={2.75} />
              Registrar treino
            </button>
          )}

          <div className="flex-1" />

          {/* Card contextual do pé da sidebar — um por tela, como no protótipo */}
          {location.pathname === "/rankings" ? (
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/60 p-3.5">
              <span className="mono-label">Fecha em</span>
              <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-primary">
                {formatPeriodCountdown("week")}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">O ranking zera domingo às 23:59.</span>
            </div>
          ) : location.pathname === "/treinos" ? (
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/60 p-3.5">
              <span className="mono-label">Biblioteca</span>
              <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-foreground">{LIBRARY_SIZE}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">exercícios prontos para montar sua ficha.</span>
            </div>
          ) : location.pathname === "/progresso" && weighIns.length > 0 ? (
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/60 p-3.5">
              <span className="mono-label">Desde {format(new Date(weightSince!.recorded_at), "MMMM", { locale: ptBR })}</span>
              <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-primary">
                {weightDelta > 0 ? "+" : weightDelta < 0 ? "−" : "±"}
                {Math.abs(weightDelta).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {weighIns.length} {weighIns.length === 1 ? "pesagem registrada" : "pesagens registradas"}.
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/60 p-2.5 text-left hover:border-primary"
            >
              <InitialAvatar
                name={myProfile?.display_name || user?.email || "?"}
                avatarUrl={myProfile?.avatar_url}
                isSelf
                className="h-8 w-8 rounded-[9px] text-xs"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-xs font-bold text-foreground">
                  {myProfile?.display_name || user?.email || "Você"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {myWeekEntry && myWeekEntry.count > 0
                    ? `${myWeekEntry.position}º · ${myWeekEntry.count} ${myWeekEntry.count === 1 ? "treino" : "treinos"}`
                    : "sem treino na semana"}
                </span>
              </span>
            </button>
          )}
        </aside>

        <main ref={mainRef} className="flex-1 overflow-auto pb-24 lg:pb-8">
          {children}
        </main>

        {showScrollTop && (
          <button
            type="button"
            aria-label="Voltar ao topo"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            // Centralizado na área de conteúdo: no desktop desloca metade da
            // sidebar (248px) para não ficar torto em relação ao que se lê.
            className="fixed bottom-28 left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-[13px] border border-border bg-card/90 text-foreground shadow-lg backdrop-blur-sm animate-pop-in hover:border-primary hover:text-primary safe-area-bottom lg:left-[calc(50%+124px)]"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}

        <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background from-[60%] to-transparent safe-area-bottom lg:hidden">
          <div className="pointer-events-auto mx-auto grid max-w-lg grid-cols-5 items-end gap-0.5 px-3 pb-3 pt-2">
            {navItems.map((item) => {
              const isActive = !item.isAction && location.pathname === item.path;
              const Icon = item.icon;

              if (item.isAction) {
                return (
                  <div key={item.path} className="flex justify-center">
                    <button
                      type="button"
                      aria-label="Registrar treino"
                      onClick={() => handleNav(item)}
                      className="mb-1.5 flex h-[60px] w-[60px] items-center justify-center rounded-[19px] bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary-edge)),0_16px_32px_-8px_hsl(var(--primary)/0.4)] transition-[transform,box-shadow] active:translate-y-[2px] active:shadow-[0_3px_0_hsl(var(--primary-edge)),0_12px_24px_-8px_hsl(var(--primary)/0.4)]"
                    >
                      <Icon className="h-7 w-7" strokeWidth={2.75} />
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item)}
                  className={cn(
                    "flex min-h-[48px] flex-col items-center justify-end gap-1 py-1.5 text-[9px] transition-colors",
                    isActive ? "font-bold text-primary" : "font-semibold text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <CreateGroupDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          onCreate={async (name) => (await createGroup.mutateAsync(name)) ?? null}
          isCreating={createGroup.isPending}
        />
        <JoinGroupDialog
          open={joinGroupOpen}
          onOpenChange={setJoinGroupOpen}
          onJoin={async (code) => (await joinGroup.mutateAsync(code)) ?? null}
          isJoining={joinGroup.isPending}
        />

        {allGroupIds.length > 0 && (
          <RegisterWorkoutSheet
            open={registerOpen}
            onOpenChange={(next) => {
              setRegisterOpen(next);
              if (!next) setRegisterTargetDate(null);
            }}
            initialTargetDate={registerTargetDate}
            groupIds={allGroupIds}
            onRegister={handleRegister}
            isPending={addWorkout.isPending}
          />
        )}
      </div>
    </RegisterWorkoutProvider>
  );
}
