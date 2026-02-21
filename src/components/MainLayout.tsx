import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { useAddWorkout } from "@/hooks/useWorkouts";
import { RegisterWorkoutProvider, useRegisterWorkout } from "@/contexts/RegisterWorkoutContext";
import { RegisterWorkoutSheet } from "@/components/RegisterWorkoutSheet";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Trophy, PlusCircle, Settings } from "lucide-react";

const navItems = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/rankings", label: "Rankings", icon: Trophy },
  { path: "/register", label: "Registrar", icon: PlusCircle, isAction: true },
  { path: "/settings", label: "Config", icon: Settings },
];

type MainLayoutProps = { children: React.ReactNode };

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id;
  const { data: groups = [] } = useMyGroups(userId);
  const addWorkout = useAddWorkout(userId);
  const [registerOpen, setRegisterOpen] = useState(false);

  const selectedGroupId = typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

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

      {selectedGroup && (
        <RegisterWorkoutSheet
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onRegister={addWorkout.mutateAsync}
          isPending={addWorkout.isPending}
        />
      )}
      </div>
    </RegisterWorkoutProvider>
  );
}
