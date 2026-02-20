import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dumbbell, LogOut } from "lucide-react";

export default function Index() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Dumbbell className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">FitRank</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.user_metadata?.display_name || user?.email}!
        </p>
        <p className="text-sm text-muted-foreground">
          Dashboard e grupos serão implementados na próxima fase.
        </p>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
