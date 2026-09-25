import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroups";
import { useMyProfile } from "@/hooks/useMyProfile";
import { isProfileComplete } from "@/lib/profile";
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
const CompleteProfile = lazy(() => import("@/pages/CompleteProfile"));

export function ProtectedShell() {
  const { user } = useAuth();
  const { data: groups = [], isLoading: loadingGroups } = useMyGroups(user?.id);

  const { data: profile, isLoading: loadingProfile, isError: profileError } = useMyProfile(user?.id);

  if (loadingGroups || loadingProfile) {
    return <PageLoader />;
  }

  // Nome e foto são obrigatórios antes de qualquer tela: sem eles a pessoa
  // aparece como "Sem nome" no ranking. Erro de rede não trava o app.
  if (!profileError && !isProfileComplete(profile)) {
    return (
      <Suspense fallback={<PageLoader />}>
        <CompleteProfile />
      </Suspense>
    );
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
