import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EcgBackground } from "@/components/EcgBackground";
import { ArrowRight, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

// A entrada é sempre escura (classe `dark` no wrapper): o ECG é a cena, não o tema.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="dark relative min-h-dvh cursor-crosshair overflow-hidden bg-[#0A0907] text-foreground">
      <EcgBackground />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-end gap-6 px-7 pb-9 pt-16 safe-area-bottom">
        <div className="flex flex-col gap-3.5 animate-rise-in">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-primary text-primary-foreground shadow-[0_0_44px_-6px_hsl(var(--primary)/0.6)]">
            <Zap className="h-7 w-7 fill-current" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="display-title text-5xl leading-[0.9] tracking-[-0.055em]">
              Fit<span className="text-primary">rank</span>
            </h1>
            <p className="max-w-[290px] text-[15px] leading-normal text-muted-foreground">
              Entre para acompanhar seus treinos. Alguém do seu grupo já treinou hoje.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 animate-rise-in [animation-delay:0.12s]">
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
                className="rounded-[13px] border border-border bg-card/80 p-4 text-sm font-medium text-foreground outline-none backdrop-blur-md placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.45)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="mono-label">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-[13px] border border-border bg-card/80 p-4 pr-12 font-mono text-sm font-semibold tracking-[0.24em] text-foreground outline-none backdrop-blur-md placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.45)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 animate-rise-in [animation-delay:0.22s]">
            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[15px] bg-primary p-[19px] text-base font-black text-primary-foreground shadow-[0_4px_0_hsl(var(--primary-edge)),0_18px_40px_-12px_hsl(var(--primary)/0.5)] transition-[transform,box-shadow] active:translate-y-[2px] active:shadow-[0_2px_0_hsl(var(--primary-edge)),0_14px_30px_-12px_hsl(var(--primary)/0.5)] disabled:opacity-60"
            >
              <span className="absolute left-0 top-0 h-full w-[38%] animate-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
            <p className="text-center text-[13px] font-medium text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
