import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { MainLayout } from "@/components/MainLayout";
import { PageLoader } from "@/components/PageLoader";
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";

// Index é a rota inicial e fica eager; as abas carregam ao serem abertas.
const Rankings = lazy(() => import("@/pages/Rankings"));
const Treinos = lazy(() => import("@/pages/Treinos"));
const Settings = lazy(() => import("@/pages/Settings"));
const Progresso = lazy(() => import("@/pages/Progresso"));
const Dieta = lazy(() => import("@/pages/Dieta"));

export function ProtectedShell() {
  const { user } = useAuth();
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(user?.id);

  if (loadingGroups) {
    return <PageLoader />;
  }

  const hasGroups = groups.length > 0;

  if (!hasGroups) {
    return <Index />;
  }

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Index />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="treinos" element={<Treinos />} />
          <Route path="settings" element={<Settings />} />
          <Route path="progresso" element={<Progresso />} />
          <Route path="dieta" element={<Dieta />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}
