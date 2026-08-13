import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useUpdateDietShared } from "@/hooks/useMyProfile";
import {
  useDietMeals,
  useDietLogs,
  useAddDietMeal,
  useUpdateDietMeal,
  useArchiveDietMeal,
  useToggleDietLog,
  type DietMealInput,
} from "@/hooks/useDiet";
import {
  DIET_ADHERENCE_GOAL,
  adherenceForDate,
  adherenceStreak,
  macrosForDate,
  mealsForDate,
  rangeAdherence,
  toDateKey,
  type DietItem,
  type DietMeal,
} from "@/lib/diet";
import { DietMealList } from "@/components/DietMealList";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader } from "@/components/PageLoader";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, errorMessage } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Flame, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const inputClass =
  "w-full rounded-[11px] border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary";

const emptyItem: DietItem = { name: "", qty: null };

const emptyForm: DietMealInput = {
  name: "",
  time_of_day: null,
  items: [emptyItem, emptyItem, emptyItem],
  day_of_week: null,
  kcal: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
};

/** Formulário de refeição — mesmo corpo para criar e editar. */
function MealSheet({
  meal,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  meal: DietMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: DietMealInput) => void;
  isPending: boolean;
}) {
  // Quem monta o MealSheet passa `key` com o id da refeição, então o estado
  // inicial já vem certo a cada abertura — sem effect de sincronização.
  const [form, setForm] = useState<DietMealInput>(() =>
    meal
      ? {
          name: meal.name,
          time_of_day: meal.time_of_day,
          // Uma linha vazia no fim para digitar sem precisar clicar em "Item".
          items: [...meal.items, emptyItem],
          day_of_week: meal.day_of_week,
          kcal: meal.kcal,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
        }
      : emptyForm,
  );

  const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

  const setItem = (index: number, patch: Partial<DietItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
        <div className="mx-auto w-full max-w-2xl">
          <SheetTitle className="display-title text-xl">{meal ? "Editar refeição" : "Nova refeição"}</SheetTitle>
          <SheetDescription className="text-xs">
            {meal
              ? "A versão antiga fica guardada: a aderência dos dias passados não muda."
              : "Vale a partir de hoje. Macros são opcionais."}
          </SheetDescription>

          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) return;
              onSave({
                ...form,
                name: form.name.trim(),
                // Linha em branco não vira item.
                items: form.items
                  .map((it) => ({ name: it.name.trim(), qty: it.qty?.trim() || null }))
                  .filter((it) => it.name !== ""),
              });
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="mono-label">Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Almoço"
                  maxLength={60}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:w-32">
                <span className="mono-label">Horário</span>
                <input
                  type="time"
                  value={form.time_of_day?.slice(0, 5) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, time_of_day: e.target.value || null }))}
                  className={cn(inputClass, "font-mono")}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:w-40">
                <span className="mono-label">Dia</span>
                <select
                  value={form.day_of_week ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, day_of_week: e.target.value === "" ? null : Number(e.target.value) }))
                  }
                  className={inputClass}
                >
                  <option value="">Todo dia</option>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="mono-label">Itens</span>
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    placeholder="Arroz integral"
                    maxLength={80}
                    className={cn(inputClass, "flex-[2] p-2.5")}
                  />
                  <input
                    value={item.qty ?? ""}
                    onChange={(e) => setItem(i, { qty: e.target.value || null })}
                    placeholder="150 g"
                    maxLength={30}
                    className={cn(inputClass, "flex-1 p-2.5 font-mono")}
                  />
                  <button
                    type="button"
                    aria-label={`Remover item ${i + 1}`}
                    onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={form.items.length >= 30}
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem] }))}
                className="flex items-center gap-1.5 self-start rounded-[10px] border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
                Item
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["kcal", "kcal"],
                  ["protein_g", "Prot"],
                  ["carbs_g", "Carb"],
                  ["fat_g", "Gord"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="mono-label">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form[field] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: num(e.target.value) }))}
                    className={cn(inputClass, "p-2 text-center font-mono")}
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-[13px] bg-primary text-sm font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
            >
              {isPending ? "Salvando…" : meal ? "Salvar alterações" : "Adicionar refeição"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Dieta() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: meals = [], isLoading } = useDietMeals(userId);
  const { data: logs = [] } = useDietLogs(userId);
  const { data: myProfile } = useMyProfile(userId);
  const addMeal = useAddDietMeal(userId);
  const updateMeal = useUpdateDietMeal(userId);
  const archiveMeal = useArchiveDietMeal(userId);
  const toggleLog = useToggleDietLog(userId);
  const updateDietShared = useUpdateDietShared(userId);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetFor, setSheetFor] = useState<{ meal: DietMeal | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DietMeal | null>(null);

  const today = toDateKey(new Date());
  const dateKey = toDateKey(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());

  const dayMeals = useMemo(() => mealsForDate(meals, dateKey), [meals, dateKey]);
  const doneIds = useMemo(
    () => new Set(logs.filter((l) => l.log_date === dateKey).map((l) => l.meal_id)),
    [logs, dateKey],
  );
  const adherence = useMemo(() => adherenceForDate(meals, logs, dateKey), [meals, logs, dateKey]);
  const streak = useMemo(() => adherenceStreak(meals, logs, today), [meals, logs, today]);
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1, locale: ptBR }), [selectedDate]);
  const week = useMemo(
    () => rangeAdherence(meals, logs, toDateKey(weekStart), toDateKey(addDays(weekStart, 6)), today),
    [meals, logs, weekStart, today],
  );
  const macros = useMemo(() => macrosForDate(meals, dateKey), [meals, dateKey]);

  // Faixa da semana no desktop: um quadrado por dia, verde quando bateu a meta.
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const key = toDateKey(date);
        const a = adherenceForDate(meals, logs, key);
        return { date, key, adherence: a, future: key > today };
      }),
    [weekStart, meals, logs, today],
  );

  // O plano mostra a versão vigente hoje — histórico serve para a aderência, não
  // para editar.
  const activeMeals = useMemo(() => {
    const vigentes = meals.filter((m) => m.archived_at === null || m.archived_at > today);
    return [...vigentes].sort(
      (a, b) =>
        (a.day_of_week ?? -1) - (b.day_of_week ?? -1) ||
        (a.time_of_day === null ? 1 : 0) - (b.time_of_day === null ? 1 : 0) ||
        (a.time_of_day ?? "").localeCompare(b.time_of_day ?? "") ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [meals, today]);

  const handleToggle = (meal: DietMeal, done: boolean) => {
    toggleLog.mutate(
      { mealId: meal.id, date: dateKey, done },
      { onError: (err) => toast.error(errorMessage(err, "Erro ao marcar refeição")) },
    );
  };

  const handleSave = async (input: DietMealInput) => {
    const editing = sheetFor?.meal ?? null;
    try {
      if (editing) {
        await updateMeal.mutateAsync({ meal: editing, input });
        toast.success("Refeição atualizada.");
      } else {
        await addMeal.mutateAsync({ ...input, position: activeMeals.length });
        toast.success("Refeição adicionada.");
      }
      setSheetFor(null);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar refeição"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await archiveMeal.mutateAsync(deleteTarget);
      setDeleteTarget(null);
      toast.success("Refeição removida do plano.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao remover refeição"));
    }
  };

  if (isLoading) return <PageLoader />;

  const pct = Math.round(adherence.ratio * 100);
  const goalPct = Math.round(DIET_ADHERENCE_GOAL * 100);
  const hitGoal = adherence.total > 0 && adherence.ratio >= DIET_ADHERENCE_GOAL;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 px-5 pb-4 pt-7 safe-area-top lg:max-w-5xl lg:px-8">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-title text-[28px] leading-tight text-foreground">Dieta</h1>
          <p className="text-xs text-muted-foreground">
            Marque as refeições do dia. Meta: {goalPct}% para o dia contar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetFor({ meal: null })}
          className="hidden items-center gap-2 rounded-[13px] bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-hard active-hard lg:flex"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.75} />
          Nova refeição
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
        {/* Coluna do dia */}
        <div className="flex flex-col gap-3">
          {/* Navegação de dia — futuro não abre, não dá para cumprir o que não veio */}
          <div className="flex items-center gap-2 rounded-[18px] border border-border bg-card p-2">
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm font-extrabold text-foreground">
              {isToday ? "Hoje" : format(selectedDate, "EEE · dd MMM", { locale: ptBR })}
            </span>
            <button
              type="button"
              aria-label="Próximo dia"
              disabled={isToday}
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo do dia */}
          <div data-tour-id="dieta-aderencia" className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="mono-label">Aderência do dia</span>
                <span
                  className={cn(
                    "font-mono text-[32px] font-bold leading-none tabular-nums lg:text-[40px]",
                    hitGoal ? "text-primary" : "text-foreground",
                  )}
                >
                  {adherence.total === 0 ? "—" : `${pct}%`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-[11px] border border-border bg-secondary/60 px-3 py-2">
                <Flame className={cn("h-4 w-4", streak > 0 ? "text-primary" : "text-muted-foreground")} />
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">{streak}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {streak === 1 ? "dia" : "dias"} na meta
                </span>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full transition-all", hitGoal ? "bg-primary" : "bg-accent")}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {adherence.done} de {adherence.total} refeições
              </span>
              <span>
                Semana: {week.goodDays}/{week.days} {week.days === 1 ? "dia" : "dias"} na meta
              </span>
            </div>

            {/* Semana clicável — no mobile o mesmo papel é do seletor de dia */}
            <div className="hidden grid-cols-7 gap-1.5 border-t border-border/60 pt-3 lg:grid">
              {weekDays.map((d) => {
                const good = d.adherence.total > 0 && d.adherence.ratio >= DIET_ADHERENCE_GOAL;
                const partial = d.adherence.done > 0 && !good;
                return (
                  <button
                    key={d.key}
                    type="button"
                    disabled={d.future}
                    onClick={() => setSelectedDate(d.date)}
                    className="flex flex-col items-center gap-1.5 disabled:opacity-40"
                  >
                    <span className="mono-label">{DAYS_SHORT[d.date.getDay()]}</span>
                    <span
                      className={cn(
                        "flex aspect-square w-full items-center justify-center rounded-[10px] border font-mono text-[13px] font-bold",
                        good
                          ? "border-transparent bg-primary text-primary-foreground"
                          : partial
                            ? "border-accent/60 bg-accent/10 text-accent"
                            : d.key === dateKey
                              ? "border-primary bg-secondary text-foreground"
                              : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {format(d.date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            {macros.complete ? (
              <div className="grid grid-cols-4 gap-2 border-t border-border/60 pt-3">
                {(
                  [
                    [macros.kcal, "kcal"],
                    [macros.protein_g, "prot"],
                    [macros.carbs_g, "carb"],
                    [macros.fat_g, "gord"],
                  ] as const
                ).map(([value, label]) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                      {value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="mono-label">{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              dayMeals.length > 0 && (
                <span className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground/70">
                  Total de macros aparece quando todas as refeições do dia tiverem kcal.
                </span>
              )
            )}
          </div>

          {/* Refeições do dia */}
          {dayMeals.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={meals.length === 0 ? "Sem dieta cadastrada" : "Nada previsto neste dia"}
              description={
                meals.length === 0
                  ? "Cadastre as refeições do seu plano para acompanhar a aderência."
                  : "As refeições deste dia da semana não foram cadastradas."
              }
              action={
                <button
                  type="button"
                  onClick={() => setSheetFor({ meal: null })}
                  className="flex items-center gap-2 rounded-[11px] bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-hard active-hard"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.75} />
                  Nova refeição
                </button>
              }
            />
          ) : (
            <DietMealList meals={dayMeals} doneIds={doneIds} onToggle={handleToggle} />
          )}
        </div>

        {/* Coluna do plano — no desktop acompanha a rolagem */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div data-tour-id="dieta-plano" className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="mono-label">Meu plano</span>
              <button
                type="button"
                onClick={() => setSheetFor({ meal: null })}
                className="flex items-center gap-1.5 rounded-[10px] border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary lg:hidden"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
                Nova
              </button>
            </div>

            {activeMeals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma refeição cadastrada.</p>
            ) : (
              activeMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-2 rounded-[13px] border border-border/60 bg-secondary/40 p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-extrabold text-foreground">{meal.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {meal.time_of_day ? meal.time_of_day.slice(0, 5) : "sem hora"} ·{" "}
                      {meal.day_of_week === null ? "todo dia" : DAYS[meal.day_of_week]} ·{" "}
                      {meal.items.length} {meal.items.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Editar ${meal.name}`}
                    onClick={() => setSheetFor({ meal })}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${meal.name}`}
                    onClick={() => setDeleteTarget(meal)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Compartilhar com o grupo */}
          <div data-tour-id="dieta-compartilhar" className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">Mostrar dieta no grupo</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                Desligado, sua dieta é só sua. Ligado, quem divide grupo com você vê o plano e a aderência.
              </span>
            </div>
            <Switch
              checked={myProfile?.diet_shared ?? false}
              disabled={updateDietShared.isPending}
              onCheckedChange={(checked) =>
                updateDietShared.mutate(checked, { onError: () => toast.error("Erro ao salvar preferência") })
              }
              aria-label="Mostrar dieta no grupo"
            />
          </div>
        </div>
      </div>

      {sheetFor && (
        <MealSheet
          key={sheetFor.meal?.id ?? "nova"}
          meal={sheetFor.meal}
          open
          onOpenChange={(open) => !open && setSheetFor(null)}
          onSave={handleSave}
          isPending={addMeal.isPending || updateMeal.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Remover do plano?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} sai do plano a partir de hoje. O histórico dos dias já marcados continua intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
