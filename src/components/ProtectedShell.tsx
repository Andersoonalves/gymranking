import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { MainLayout } from "@/components/MainLayout";
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Rankings from "@/pages/Rankings";
import Treinos from "@/pages/Treinos";
import Settings from "@/pages/Settings";
import Progresso from "@/pages/Progresso";

export function ProtectedShell() {
  const { user } = useAuth();
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(user?.id);

  if (loadingGroups) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasGroups = groups.length > 0;

  if (!hasGroups) {
    return <Index />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route index element={<Index />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="treinos" element={<Treinos />} />
        <Route path="settings" element={<Settings />} />
        <Route path="progresso" element={<Progresso />} />
      </Routes>
    </MainLayout>
  );
}
