import { useMemo, useState } from "react";
import { addMonths, format, isAfter, isSameDay, isSameMonth, startOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workout } from "@/hooks/useWorkouts";
import type { DayPhoto } from "@/lib/workout-photos";

type WorkoutCalendarProps = {
  workouts: Workout[];
  /** Ao escolher um dia sem treinos, abre o fluxo de registro para esse dia. */
  onEmptyDaySelect?: (date: Date) => void;
  onDeleteWorkout?: (params: { id: string; label: string }) => void;
  isDeleting?: boolean;
  /**
   * Fotos por dia, chave `yyyy-MM-dd`, da mais recente para a mais antiga. No
   * dia que tem foto elas ocupam a célula no lugar do número, empilhadas como
   * um baralho; dia sem foto continua mostrando a data. Quem monta o mapa
   * resolve as URLs (as fotos ficam em bucket privado).
   */
  photosByDay?: Record<string, DayPhoto[]>;
  /** Clique num dia com foto abre as fotos em slides em vez de selecionar o dia. */
  onPhotosOpen?: (photos: DayPhoto[]) => void;
};

/**
 * Leque da pilha por profundidade (0 = foto de cima, reta). Todas na mesma
 * escala, menor que a célula: é a rotação mais o deslocamento que fazem as de
 * baixo aparecerem. Se as de baixo fossem menores, sumiriam atrás da de cima.
 */
const STACK_STYLES = [
  { rotate: 0, scale: 0.76, x: 0, y: 0 },
  { rotate: 15, scale: 0.76, x: 12, y: -6 },
  { rotate: -16, scale: 0.76, x: -12, y: -5 },
];

const DOW = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Intensidade do heatmap por quantidade de treinos no dia. */
function heatClass(count: number, isToday: boolean) {
  if (count >= 3) return "bg-primary text-primary-foreground border-transparent font-bold";
  if (count === 2) return "bg-primary/55 text-foreground border-transparent font-bold";
  if (count === 1) return "bg-primary/25 text-foreground border-transparent font-semibold";
  if (isToday) return "bg-secondary text-foreground border-primary font-bold";
  return "bg-transparent text-muted-foreground border-border/60";
}

/** Células do mês: null antes do dia 1 (semana começa na segunda). */
function monthCells(month: Date) {
  const first = startOfMonth(month);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  return cells;
}

export function WorkoutCalendar({
  workouts,
  onEmptyDaySelect,
  onDeleteWorkout,
  isDeleting,
  photosByDay,
  onPhotosOpen,
}: WorkoutCalendarProps) {
  const today = startOfDay(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const countByDay = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const key = format(startOfDay(new Date(w.workout_date)), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    }
    return map;
  }, [workouts]);

  const workoutsOn = (d: Date) => countByDay.get(format(d, "yyyy-MM-dd")) ?? [];
  const monthTotal = workouts.filter((w) => isSameMonth(new Date(w.workout_date), cursor)).length;
  const yearTotal = workouts.filter((w) => new Date(w.workout_date).getFullYear() === cursor.getFullYear()).length;
  const selectedWorkouts = selectedDate ? workoutsOn(selectedDate) : [];

  const pickDay = (d: Date) => {
    setSelectedDate(d);
    if (workoutsOn(d).length === 0 && !isAfter(d, today)) onEmptyDaySelect?.(d);
  };

  const total = viewMode === "month" ? monthTotal : yearTotal;
  const totalPeriod =
    viewMode === "month" ? format(cursor, "MMMM", { locale: ptBR }) : String(cursor.getFullYear());

  return (
    <div className="rounded-[18px] border border-border bg-card p-4">
      {/* Placar do período: o número é o que interessa, o resto do card é contexto. */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="display-title text-[34px] leading-none tabular-nums text-primary">{total}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          {total === 1 ? "treino" : "treinos"} em {totalPeriod}
        </span>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={viewMode === "month" ? "Mês anterior" : "Ano anterior"}
            onClick={() => setCursor((c) => (viewMode === "month" ? addMonths(c, -1) : addMonths(c, -12)))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="display-title truncate text-[15px] text-foreground">
            {viewMode === "month" ? format(cursor, "MMMM yyyy", { locale: ptBR }) : cursor.getFullYear()}
          </span>
          <button
            type="button"
            aria-label={viewMode === "month" ? "Próximo mês" : "Próximo ano"}
            onClick={() => setCursor((c) => (viewMode === "month" ? addMonths(c, 1) : addMonths(c, 12)))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]">
          {(["month", "year"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                "rounded-md px-2.5 py-[5px] text-[11px]",
                viewMode === mode ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
              )}
            >
              {mode === "month" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" ? (
        <>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {DOW.map((l) => (
              <span key={l} className="text-center font-mono text-[9px] font-semibold text-muted-foreground/70">
                {l}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells(cursor).map((d, i) => {
              if (d === null) return <span key={`x${i}`} />;
              const photos = photosByDay?.[format(d, "yyyy-MM-dd")] ?? [];
              const hasPhotos = photos.length > 0;
              return (
                <button
                  key={d.getTime()}
                  type="button"
                  onClick={() => (hasPhotos && onPhotosOpen ? onPhotosOpen(photos) : pickDay(d))}
                  aria-label={
                    hasPhotos
                      ? `${photos.length} ${photos.length === 1 ? "foto" : "fotos"} em ${format(d, "dd/MM")}`
                      : undefined
                  }
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg border font-mono text-xs transition-transform hover:scale-105",
                    hasPhotos ? "border-transparent" : cn("overflow-hidden", heatClass(workoutsOn(d).length, isSameDay(d, today))),
                    selectedDate && isSameDay(d, selectedDate) && "ring-2 ring-ring ring-offset-1 ring-offset-card",
                    isAfter(d, today) && "opacity-40",
                  )}
                >
                  {hasPhotos
                    ? // Pintadas de trás para frente: a mais antiga fica no fundo,
                      // a mais recente reta e por cima.
                      [...photos]
                        .slice(0, STACK_STYLES.length)
                        .reverse()
                        .map((p, idx, arr) => {
                          const { rotate, scale, x, y } = STACK_STYLES[arr.length - 1 - idx];
                          return (
                            <img
                              key={p.id}
                              src={p.url}
                              alt=""
                              loading="lazy"
                              style={{
                                transform: `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${scale})`,
                                zIndex: idx,
                              }}
                              className="absolute inset-0 h-full w-full rounded-[6px] border border-card object-cover shadow-md"
                            />
                          );
                        })
                    : d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] text-muted-foreground/70">menos</span>
              <span className="h-[11px] w-[11px] rounded border border-border bg-transparent" />
              <span className="h-[11px] w-[11px] rounded bg-primary/25" />
              <span className="h-[11px] w-[11px] rounded bg-primary/55" />
              <span className="h-[11px] w-[11px] rounded bg-primary" />
              <span className="font-mono text-[9px] text-muted-foreground/70">mais</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {MONTHS_SHORT.map((label, m) => {
              const month = new Date(cursor.getFullYear(), m, 1);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setCursor(month);
                    setViewMode("month");
                  }}
                  className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-secondary/40 p-2 text-left hover:border-primary"
                >
                  <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-muted-foreground">{label}</span>
                  <span className="grid grid-cols-7 gap-[2px]">
                    {monthCells(month).map((d, i) => (
                      <span
                        key={i}
                        className={cn(
                          "aspect-square rounded-[2px]",
                          d === null
                            ? "bg-transparent"
                            : workoutsOn(d).length >= 2
                              ? "bg-primary"
                              : workoutsOn(d).length === 1
                                ? "bg-primary/45"
                                : "bg-border/60",
                        )}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedDate && viewMode === "month" && selectedWorkouts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="mono-label">Treinos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
          {selectedWorkouts.map((w) => (
            <div key={w.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{w.workout_type}</p>
                {w.notes && <p className="truncate text-xs text-muted-foreground">{w.notes}</p>}
              </div>
              {onDeleteWorkout && (
                <button
                  type="button"
                  aria-label="Excluir treino"
                  disabled={isDeleting}
                  onClick={() => onDeleteWorkout({ id: w.id, label: w.workout_type })}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {onEmptyDaySelect && !isAfter(selectedDate, today) && (
            <button
              type="button"
              onClick={() => onEmptyDaySelect(selectedDate)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar outro treino neste dia
            </button>
          )}
        </div>
      )}
    </div>
  );
}
