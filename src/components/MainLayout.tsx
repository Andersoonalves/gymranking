import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { useAddWorkouts } from "@/hooks/useWorkouts";
import { RegisterWorkoutProvider } from "@/contexts/RegisterWorkoutContext";
import { RegisterWorkoutSheet } from "@/components/RegisterWorkoutSheet";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewWorkout } from "@/lib/push";
import { cn } from "@/lib/utils";
import { Home, Trophy, Plus, ClipboardList, TrendingUp } from "lucide-react";

const navItems = [
  { path: "/", label: "Início", icon: Home },
  { path: "/rankings", label: "Rankings", icon: Trophy },
  { path: "/register", label: "", icon: Plus, isAction: true },
  { path: "/treinos", label: "Treinos", icon: ClipboardList },
  { path: "/progresso", label: "Progresso", icon: TrendingUp },
];

type MainLayoutProps = { children: React.ReactNode };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const addWorkouts = useAddWorkouts(userId);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerTargetDate, setRegisterTargetDate] = useState<Date | null>(null);

  const allGroupIds = groups.map((g) => g.id);

  const handleRegister = async (params: {
    group_ids: string[];
    workout_types: string[];
    workout_date: string;
    notes?: string | null;
    photo_url?: string | null;
  }) => {
    await addWorkouts.mutateAsync(params);
    if (session?.access_token && allGroupIds.length > 0) {
      const displayName =
        (await supabase.from("profiles").select("display_name").eq("user_id", userId).single()).data?.display_name ??
        user?.email ??
        "Alguém";
      for (const group of groups) {
        notifyNewWorkout(supabaseUrl, anonKey, session.access_token, {
          group_id: group.id,
          group_name: group.name,
          exclude_user_id: userId!,
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
      <div className="flex min-h-dvh flex-col bg-background">
        <main className="flex-1 overflow-auto pb-24">
          {children}
        </main>

        <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background from-[60%] to-transparent safe-area-bottom">
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
            isPending={addWorkouts.isPending}
          />
        )}
      </div>
    </RegisterWorkoutProvider>
  );
}
