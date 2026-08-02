import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-8 text-center">
        <span className="font-mono text-5xl font-bold text-primary">404</span>
        <span className="text-base font-extrabold text-foreground">Essa página não existe</span>
        <span className="text-xs leading-relaxed text-muted-foreground">Talvez o link esteja velho. Volte pro Início.</span>
        <Link
          to="/"
          className="mt-1 rounded-[11px] border border-border bg-secondary px-4 py-3 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
        >
          Ir para o Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
