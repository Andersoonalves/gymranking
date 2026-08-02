import { useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/PageLoader";
import { toast } from "sonner";

/**
 * Deep-link de convite: /join?code=XXX.
 * Logado entra no grupo direto; deslogado cai no cadastro com o código aplicado.
 */
export default function Join() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef(false);
  const code = searchParams.get("code")?.trim().toUpperCase() ?? "";

  useEffect(() => {
    if (loading || !user || !code || attempted.current) return;
    attempted.current = true;
    supabase
      .rpc("join_group_by_invite_code", { _code: code })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Convite inválido ou expirado.");
        } else {
          toast.success(`Você entrou em ${data?.[0]?.name ?? "um grupo"}!`);
        }
        navigate("/", { replace: true });
      });
  }, [loading, user, code, navigate]);

  if (!code) return <Navigate to="/" replace />;
  if (!loading && !user) return <Navigate to={`/signup?code=${encodeURIComponent(code)}`} replace />;
  return <PageLoader />;
}
