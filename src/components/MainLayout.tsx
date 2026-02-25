import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { useAddWorkouts } from "@/hooks/useWorkouts";
import { RegisterWorkoutProvider, useRegisterWorkout } from "@/contexts/RegisterWorkoutContext";
import { RegisterWorkoutSheet } from "@/components/RegisterWorkoutSheet";
import { supabase } from "@/integrations/supabase/client";
// GROUPS_STORAGE_KEY no longer needed for registration
import { notifyNewWorkout } from "@/lib/push";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Trophy, PlusCircle, Settings, ClipboardList } from "lucide-react";

const navItems = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/rankings", label: "Rankings", icon: Trophy },
  { path: "/register", label: "Registrar", icon: PlusCircle, isAction: true },
  { path: "/treinos", label: "Treinos", icon: ClipboardList },
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
      // Notify for each group
      for (const group of groups) {
        notifyNewWorkout(supabaseUrl, anonKey, session.access_token, {
          group_id: group.id,
          group_name: group.name,
          exclude_user_id: userId!,
          display_name: displayName,
          workout_type: params.workout_types.join(", "),
        }).catch(() => {});
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
    <RegisterWorkoutProvider open={registerOpen} setOpen={setRegisterOpen}>
      <div className="flex min-h-screen flex-col bg-background pb-20">
        <main className="flex-1 overflow-auto">
          {children}
        </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = !item.isAction && location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  item.isAction
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {allGroupIds.length > 0 && (
        <RegisterWorkoutSheet
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          groupIds={allGroupIds}
          onRegister={handleRegister}
          isPending={addWorkouts.isPending}
        />
      )}
      </div>
    </RegisterWorkoutProvider>
  );
}
