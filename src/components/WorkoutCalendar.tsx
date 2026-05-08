import { useState, useMemo, useEffect } from "react";
import { format, startOfDay, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, CalendarDays, LayoutGrid, Check } from "lucide-react";
import type { Workout } from "@/hooks/useWorkouts";
import type { DayContentProps } from "react-day-picker";

type WorkoutCalendarProps = {
  workouts: Workout[];
  /** Ao escolher um dia sem treinos, abre o fluxo de registro para esse dia. */
  onEmptyDaySelect?: (date: Date) => void;
  onDeleteWorkout?: (params: { id: string; group_id: string; label: string }) => void;
  isDeleting?: boolean;
};

function DayWithCheck({ date, activeModifiers, ...props }: DayContentProps) {
  return (
    <span className="relative flex items-center justify-center w-full h-full" {...props}>
      {date.getDate()}
      {activeModifiers?.hasWorkout && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="h-1.5 w-1.5" strokeWidth={3} aria-hidden />
        </span>
      )}
    </span>
  );
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function WorkoutCalendar({
  workouts,
  onEmptyDaySelect,
  onDeleteWorkout,
  isDeleting = false,
}: WorkoutCalendarProps) {
  const today = startOfDay(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach((w) => {
      const d = startOfDay(new Date(w.workout_date));
      set.add(d.toISOString());
    });
    return Array.from(set).map((s) => new Date(s));
  }, [workouts]);

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    workouts.forEach((w) => {
      const key = format(startOfDay(new Date(w.workout_date)), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    });
    return map;
  }, [workouts]);

  const selectedWorkouts = selectedDate
    ? workoutsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const years = useMemo(() => {
    const y = today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - 2 + i);
  }, [today.getFullYear()]);

  useEffect(() => {
    if (viewMode === "year") {
      setCurrentMonth(new Date(today.getFullYear(), 0, 1));
    } else {
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, [viewMode, today.getFullYear(), today.getMonth()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "year")}>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="month" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Mês
            </TabsTrigger>
            <TabsTrigger value="year" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Ano
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {viewMode === "month" && (
            <>
              <Select
                value={currentMonth.getMonth().toString()}
                onValueChange={(v) =>
                  setCurrentMonth((prev) => setMonth(prev, Number(v)))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentMonth.getFullYear().toString()}
                onValueChange={(v) =>
                  setCurrentMonth((prev) => setYear(prev, Number(v)))
                }
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {viewMode === "year" && (
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={(v) =>
                setCurrentMonth(new Date(Number(v), 0, 1))
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(d) => {
            setSelectedDate(d ?? null);
            if (d && onEmptyDaySelect) {
              const key = format(startOfDay(d), "yyyy-MM-dd");
              const list = workoutsByDate.get(key) ?? [];
              if (list.length === 0) {
                onEmptyDaySelect(d);
              }
            }
          }}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          numberOfMonths={viewMode === "year" ? 12 : 1}
          pagedNavigation={viewMode === "year"}
          locale={ptBR}
          modifiers={{
            hasWorkout: workoutDates,
          }}
          modifiersClassNames={{
            hasWorkout: "bg-primary/15 text-foreground font-medium ring-1 ring-primary/40",
          }}
          components={{
            DayContent: DayWithCheck,
          }}
          className={viewMode === "year" ? "p-2 sm:p-4" : undefined}
          classNames={{
            row: "flex w-full mt-2 gap-1",
            ...(viewMode === "year"
              ? {
                  months: "grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-10 gap-y-12",
                  month: "min-w-0 w-full flex flex-col shrink-0",
                  caption: "flex justify-center pt-1 pb-3 relative",
                  caption_label: "text-sm sm:text-base font-semibold",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground flex-1 font-normal text-[0.7rem] sm:text-xs p-1 text-center",
                  cell: "flex-1 aspect-square text-center text-xs sm:text-sm p-0 relative",
                  day: "h-full w-full p-0 text-xs sm:text-sm font-normal aria-selected:opacity-100",
                }
              : {}),
          }}
        />
      </div>

      {selectedDate && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 font-medium">
            Treinos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h4>
          {selectedWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum treino registrado neste dia.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedWorkouts.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{w.workout_type}</span>
                  {w.notes && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={w.notes}>
                      {w.notes}
                    </span>
                  )}
                  {onDeleteWorkout && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        onDeleteWorkout({
                          id: w.id,
                          group_id: w.group_id,
                          label: w.workout_type,
                        })
                      }
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
