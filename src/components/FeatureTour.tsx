import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SEEN_TOURS_KEY, SHOW_TOUR_EVENT } from "@/lib/constants";
import {
  FEATURE_TOURS,
  latestTour,
  parseSeenTours,
  pendingTour,
  serializeSeenTours,
  type FeatureTour as Tour,
  type TourStep,
} from "@/lib/feature-tours";
import { isBoxVisible, spotlightBox, tooltipPosition, type Box } from "@/lib/tour-position";
import { cn } from "@/lib/utils";
import { ArrowRight, LayoutGrid, Target, UtensilsCrossed, Users, X } from "lucide-react";

const ICONS: Record<TourStep["icon"], typeof UtensilsCrossed> = {
  utensils: UtensilsCrossed,
  target: Target,
  users: Users,
  layout: LayoutGrid,
};

/** Quanto tempo esperar o alvo aparecer depois de trocar de rota. */
const TARGET_TIMEOUT_MS = 1500;

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * Um `data-tour-id` pode existir em dois lugares (barra do mobile e sidebar do
 * desktop). Vale o que está realmente na tela: o outro tem rect zerado porque a
 * media query o esconde.
 */
function findTarget(tourId: string): HTMLElement | null {
  const candidatos = [...document.querySelectorAll<HTMLElement>(`[data-tour-id="${tourId}"]`)];
  return candidatos.find((el) => el.getBoundingClientRect().width > 0) ?? null;
}

const toBox = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/**
 * Tour de novidades com spotlight: escurece a tela, abre um furo no elemento real
 * e encosta o balão nele. Abre sozinho no primeiro carregamento depois do deploy
 * e pode ser reaberto pelos Ajustes (SHOW_TOUR_EVENT). O que já foi visto fica em
 * localStorage — é preferência de dispositivo, não dado de conta.
 */
export function FeatureTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [tour, setTour] = useState<Tour | null>(null);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 220 });

  const current = tour?.steps[step];

  // Abre o tour pendente uma vez por dispositivo. Espera o usuário carregar: sem
  // `created_at` não há como saber se a conta é anterior ao lançamento.
  //
  // O ref garante uma abertura por carregamento de página: o `user` do
  // AuthContext troca de identidade a cada refresh de token, e sem essa trava o
  // tour voltava para o primeiro passo no meio da leitura.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!user || autoOpened.current) return;
    const seen = parseSeenTours(localStorage.getItem(SEEN_TOURS_KEY));
    const next = pendingTour(FEATURE_TOURS, seen, user.created_at);
    if (next) {
      autoOpened.current = true;
      setTour(next);
      setStep(0);
    }
  }, [user]);

  // Ajustes → "Ver novidades": reabre o último tour mesmo já visto.
  useEffect(() => {
    const onShow = () => {
      const latest = latestTour(FEATURE_TOURS);
      if (latest) {
        setTour(latest);
        setStep(0);
      }
    };
    window.addEventListener(SHOW_TOUR_EVENT, onShow);
    return () => window.removeEventListener(SHOW_TOUR_EVENT, onShow);
  }, []);

  // O passo pode morar em outra tela: navega antes de procurar o alvo.
  useEffect(() => {
    if (current?.route && current.route !== location.pathname) navigate(current.route);
  }, [current?.route, location.pathname, navigate]);

  // Procura o alvo até ele existir (a rota nova monta em outro tick), rola até
  // ele e mede. Passo sem alvo — ou alvo que não existe nesta tela — fica com
  // box null e o balão vai para o centro.
  useEffect(() => {
    if (!current) return;
    if (!current.target) {
      setBox(null);
      return;
    }
    let cancelled = false;
    const deadline = Date.now() + TARGET_TIMEOUT_MS;

    const procurar = () => {
      if (cancelled) return;
      const el = findTarget(current.target!);
      if (!el) {
        if (Date.now() < deadline) requestAnimationFrame(procurar);
        else setBox(null);
        return;
      }
      if (!isBoxVisible(toBox(el), viewport())) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // Deixa o scroll terminar antes de medir, senão o furo nasce torto.
        setTimeout(() => !cancelled && setBox(toBox(el)), 320);
        return;
      }
      setBox(toBox(el));
    };

    procurar();
    return () => {
      cancelled = true;
    };
  }, [current, location.pathname]);

  // Rolagem e resize movem o alvo — o furo precisa acompanhar.
  const remeasure = useCallback(() => {
    if (!current?.target) return;
    const el = findTarget(current.target);
    setBox(el ? toBox(el) : null);
  }, [current?.target]);

  useEffect(() => {
    if (!tour) return;
    window.addEventListener("resize", remeasure);
    document.addEventListener("scroll", remeasure, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("scroll", remeasure, { capture: true });
    };
  }, [tour, remeasure]);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (el) setTooltipSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, [step, tour, box]);

  const close = useCallback(
    (goTo?: string) => {
      if (tour) {
        const seen = parseSeenTours(localStorage.getItem(SEEN_TOURS_KEY));
        localStorage.setItem(SEEN_TOURS_KEY, serializeSeenTours([...seen, tour.id]));
      }
      setTour(null);
      setBox(null);
      if (goTo) navigate(goTo);
    },
    [tour, navigate],
  );

  // Esc fecha, setas navegam — o tour tem foco da tela toda enquanto está aberto.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && step < tour.steps.length - 1) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, step, close]);

  if (!tour || !current) return null;

  const vp = viewport();
  const hole = box ? spotlightBox(box, vp) : null;
  const pos = tooltipPosition(hole, tooltipSize, vp);
  const isLast = step === tour.steps.length - 1;
  const Icon = ICONS[current.icon];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Novidade: ${tour.title}`}
      className="fixed inset-0 z-[60]"
      // O clique fora não fecha, para ninguém perder o tour ao tocar na tela; a
      // saída é o X, o "Pular" ou Esc.
      onClick={(e) => e.stopPropagation()}
    >
      {hole ? (
        <>
          {/* Furo do spotlight: a sombra gigante escurece tudo em volta e o
              elemento real continua aparecendo por baixo deste div. */}
          <div
            className="pointer-events-none absolute rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] ring-2 ring-primary transition-all duration-200"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
          {/* Trava o toque no resto da tela sem cobrir o furo */}
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(0, hole.top) }} />
          <div
            className="pointer-events-auto absolute inset-x-0 bottom-0"
            style={{ top: hole.top + hole.height }}
          />
          <div
            className="pointer-events-auto absolute left-0"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
          />
          <div
            className="pointer-events-auto absolute right-0"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, vp.width - hole.left - hole.width) }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/72" />
      )}

      <div
        ref={tooltipRef}
        style={{ top: pos.top, left: pos.left }}
        className="absolute flex w-[min(340px,calc(100vw-24px))] flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-2xl animate-pop-in"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="mono-label text-primary">
              Novidade · {step + 1}/{tour.steps.length}
            </span>
            <span className="text-sm font-extrabold leading-tight text-foreground">{current.title}</span>
          </div>
          <button
            type="button"
            aria-label="Fechar novidades"
            onClick={() => close()}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="flex items-center gap-1.5">
          {tour.steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Passo ${i + 1}: ${s.title}`}
              aria-current={i === step}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-[11px] border border-border bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => close()}
              className="px-2 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Pular
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? close(tour.cta?.path) : setStep((s) => s + 1))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-hard active-hard"
          >
            {isLast ? (tour.cta?.label ?? "Entendi") : "Próximo"}
            {isLast && tour.cta && <ArrowRight className="h-4 w-4" strokeWidth={2.75} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
