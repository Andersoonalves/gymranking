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
import { LayoutDashboard, Trophy, Plus, Settings, ClipboardList, TrendingUp } from "lucide-react";

const navItems = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/rankings", label: "Rankings", icon: Trophy },
  { path: "/register", label: "", icon: Plus, isAction: true },
  { path: "/treinos", label: "Treinos", icon: ClipboardList },
  { path: "/progresso", label: "Progresso", icon: TrendingUp },
  { path: "/settings", label: "Config", icon: Settings },
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

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
          <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2 pb-2">
            {navItems.map((item) => {
              const isActive = !item.isAction && location.pathname === item.path;
              const Icon = item.icon;

              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNav(item)}
                    className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors min-w-[56px]",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-primary" />
                  )}
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
