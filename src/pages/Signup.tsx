import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [inviteGroup, setInviteGroup] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Cadastro por convite: mostra em qual grupo a pessoa está entrando.
  useEffect(() => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 6) {
      setInviteGroup(null);
      return;
    }
    let cancelled = false;
    supabase
      .rpc("find_group_by_invite_code", { _code: code })
      .then(({ data }) => {
        if (!cancelled) setInviteGroup(data?.[0]?.name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setPasswordError(true);
      return;
    }
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast.error("Informe o código do grupo");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, code);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar.");
      navigate("/login");
    }
  };

  const inputClass =
    "rounded-xl border border-border bg-card p-[15px] text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary";

  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-7 py-10 safe-area-top safe-area-bottom">
        {inviteGroup && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-4 animate-rise-in">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-primary text-lg font-black text-primary-foreground">
              {inviteGroup.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="mono-label text-primary">Convite aceito</span>
              <span className="text-[15px] font-extrabold leading-tight">Você entra em {inviteGroup}</span>
              <span className="font-mono text-[11px] text-muted-foreground">CÓDIGO {inviteCode.trim().toUpperCase()}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="display-title text-3xl leading-tight">Criar conta</h1>
          <p className="text-[13px] leading-normal text-muted-foreground">
            Leva 20 segundos. Depois disso é só treinar e registrar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            {!searchParams.get("code") && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="invite-code" className="mono-label">
                  Código de convite
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="Ex: A1B2C3D4"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className={`${inputClass} font-mono uppercase tracking-[0.2em]`}
                />
                <span className="text-[11px] text-muted-foreground/70">
                  Peça o código de convite para quem criou o grupo.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="mono-label">
                Nome
              </label>
              <input
                id="name"
                type="text"
                placeholder="Como o grupo vai te ver"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="mono-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="mono-label">
                Senha
              </label>
              <input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (e.target.value.length >= 6) setPasswordError(false);
                }}
                required
                minLength={6}
                autoComplete="new-password"
                className={`${inputClass} ${passwordError ? "border-destructive" : ""}`}
              />
              {passwordError && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Mínimo 6 caracteres.
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-[14px] bg-primary p-[18px] text-base font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : inviteGroup ? (
              "Criar conta e entrar no grupo"
            ) : (
              "Criar conta"
            )}
          </button>
          <p className="text-center text-[13px] font-medium text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
