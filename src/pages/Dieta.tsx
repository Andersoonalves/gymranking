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
  useDietVariations,
  useAddDietVariation,
  useUpdateDietVariation,
  useDeleteDietVariation,
  type DietMealInput,
  type DietVariationInput,
} from "@/hooks/useDiet";
import {
  DIET_ADHERENCE_GOAL,
  adherenceForDate,
  adherenceStreak,
  macrosForDate,
  mealsForDate,
  planSections,
  rangeAdherence,
  toDateKey,
  variationGroups,
  type DietItem,
  type DietMeal,
  type DietVariation,
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
  "w-full rounded-xl border border-border bg-background p-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary";

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

/** Linhas de item (alimento + quantidade) — usado na refeição e na variação. */
function ItemsEditor({ items, onChange }: { items: DietItem[]; onChange: (items: DietItem[]) => void }) {
  const setItem = (index: number, patch: Partial<DietItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label">Itens</span>
      {items.map((item, i) => (
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
            className={cn(inputClass, "flex-1 p-2.5 tabular-nums")}
          />
          <button
            type="button"
            aria-label={`Remover item ${i + 1}`}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= 30}
        onClick={() => onChange([...items, emptyItem])}
        className="flex items-center gap-1.5 self-start rounded-[10px] border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
        Item
      </button>
    </div>
  );
}

/** Blocos em branco não viram item na hora de salvar. */
const cleanItems = (items: DietItem[]): DietItem[] =>
  items.map((it) => ({ name: it.name.trim(), qty: it.qty?.trim() || null })).filter((it) => it.name !== "");

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-2xl">
          <SheetTitle className="text-[22px] font-semibold tracking-tight">{meal ? "Editar refeição" : "Nova refeição"}</SheetTitle>
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
              onSave({ ...form, name: form.name.trim(), items: cleanItems(form.items) });
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
                  className={cn(inputClass, "tabular-nums")}
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

            <ItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />

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
                    className={cn(inputClass, "p-2 text-center tabular-nums")}
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all duration-150 ease-smooth hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Salvando…" : meal ? "Salvar alterações" : "Adicionar refeição"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Formulário de variação do banco — mesmo corpo para criar e editar. */
function VariationSheet({
  variation,
  categories,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  variation: DietVariation | null;
  /** Categorias já usadas, sugeridas no datalist. */
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: DietVariationInput) => void;
  isPending: boolean;
}) {
  // Mesmo esquema do MealSheet: `key` com o id garante estado inicial certo.
  const [form, setForm] = useState<DietVariationInput>(() =>
    variation
      ? {
          category: variation.category,
          name: variation.name,
          items: [...variation.items, emptyItem],
          note: variation.note,
        }
      : { category: "", name: "", items: [emptyItem, emptyItem], note: null },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-2xl">
          <SheetTitle className="text-[22px] font-semibold tracking-tight">{variation ? "Editar variação" : "Nova variação"}</SheetTitle>
          <SheetDescription className="text-xs">
            Alternativa de troca por categoria: café da manhã, proteínas, pré-treino…
          </SheetDescription>

          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.category.trim() || !form.name.trim()) return;
              onSave({
                category: form.category.trim(),
                name: form.name.trim(),
                items: cleanItems(form.items),
                note: form.note?.trim() || null,
              });
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="mono-label">Categoria</span>
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Café da manhã"
                  maxLength={40}
                  list="variation-categories"
                  className={inputClass}
                />
                <datalist id="variation-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="mono-label">Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Opção 1"
                  maxLength={60}
                  className={inputClass}
                />
              </label>
            </div>

            <ItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />

            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Observação</span>
              <input
                value={form.note ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value || null }))}
                placeholder="≈ 450 kcal · mais leve"
                maxLength={120}
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              disabled={isPending || !form.category.trim() || !form.name.trim()}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all duration-150 ease-smooth hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Salvando…" : variation ? "Salvar alterações" : "Adicionar variação"}
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

  const { data: variations = [] } = useDietVariations(userId);
  const addVariation = useAddDietVariation(userId);
  const updateVariation = useUpdateDietVariation(userId);
  const deleteVariation = useDeleteDietVariation(userId);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetFor, setSheetFor] = useState<{ meal: DietMeal | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DietMeal | null>(null);
  const [variationSheet, setVariationSheet] = useState<{ variation: DietVariation | null } | null>(null);
  const [variationDelete, setVariationDelete] = useState<DietVariation | null>(null);

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
  const activeMeals = useMemo(() => meals.filter((m) => m.archived_at === null || m.archived_at > today), [meals, today]);
  const plan = useMemo(() => planSections(activeMeals), [activeMeals]);
  const varGroups = useMemo(() => variationGroups(variations), [variations]);
  const varCategories = useMemo(() => varGroups.map((g) => g.category), [varGroups]);

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

  const handleSaveVariation = async (input: DietVariationInput) => {
    const editing = variationSheet?.variation ?? null;
    try {
      if (editing) {
        await updateVariation.mutateAsync({ id: editing.id, input });
        toast.success("Variação atualizada.");
      } else {
        await addVariation.mutateAsync({ ...input, position: variations.length });
        toast.success("Variação adicionada.");
      }
      setVariationSheet(null);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar variação"));
    }
  };

  const handleDeleteVariation = async () => {
    if (!variationDelete) return;
    try {
      await deleteVariation.mutateAsync(variationDelete.id);
      setVariationDelete(null);
      toast.success("Variação removida.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao remover variação"));
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
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">Dieta</h1>
          <p className="text-xs text-muted-foreground">
            Marque as refeições do dia. Meta: {goalPct}% para o dia contar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetFor({ meal: null })}
          className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-150 ease-smooth hover:brightness-110 active:scale-[0.98] lg:flex"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.75} />
          Nova refeição
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
        {/* Coluna do dia */}
        <div className="flex flex-col gap-3">
          {/* Navegação de dia — futuro não abre, não dá para cumprir o que não veio */}
          <div className="flex items-center gap-2 card-rim animate-fade-up p-2">
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-foreground">
              {isToday ? "Hoje" : format(selectedDate, "EEE · dd MMM", { locale: ptBR })}
            </span>
            <button
              type="button"
              aria-label="Próximo dia"
              disabled={isToday}
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo do dia */}
          <div data-tour-id="dieta-aderencia" className="flex flex-col gap-3 card-rim animate-fade-up p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="mono-label">Aderência do dia</span>
                <span
                  className={cn(
                    "text-[32px] font-semibold leading-none tabular-nums lg:text-[40px]",
                    hitGoal ? "text-primary" : "text-foreground",
                  )}
                >
                  {adherence.total === 0 ? "—" : `${pct}%`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-[11px] border border-border bg-secondary/60 px-3 py-2">
                <Flame className={cn("h-4 w-4", streak > 0 ? "text-primary" : "text-muted-foreground")} />
                <span className="tabular-nums text-sm font-semibold tabular-nums text-foreground">{streak}</span>
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
                        "flex aspect-square w-full items-center justify-center rounded-[10px] border tabular-nums text-[13px] font-semibold",
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
                    <span className="tabular-nums text-sm font-semibold tabular-nums text-foreground">
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
                  className="flex items-center gap-2 rounded-[11px] bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-150 ease-smooth hover:brightness-110 active:scale-[0.98]"
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
          <div data-tour-id="dieta-plano" className="flex flex-col gap-3 card-rim animate-fade-up p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="mono-label">Meu plano</span>
              <button
                type="button"
                onClick={() => setSheetFor({ meal: null })}
                className="flex items-center gap-1.5 rounded-[10px] border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary lg:hidden"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
                Nova
              </button>
            </div>

            {plan.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma refeição cadastrada.</p>
            ) : (
              plan.map((section) => (
                <div key={section.day ?? "todo-dia"} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
                    <span className="mono-label">{section.day === null ? "Todo dia" : DAYS[section.day]}</span>
                    {section.kcal !== null && (
                      <span className="tabular-nums text-[11px] font-semibold tabular-nums text-primary">
                        ~{section.kcal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kcal
                      </span>
                    )}
                  </div>
                  {section.meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex flex-col gap-2 rounded-[13px] border border-border/60 bg-secondary/40 p-3"
                    >
                      <div className="flex items-center gap-2">
                        {meal.time_of_day && (
                          <span className="shrink-0 tabular-nums text-[11px] font-semibold text-primary">
                            {meal.time_of_day.slice(0, 5)}
                          </span>
                        )}
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{meal.name}</span>
                        <div className="ml-auto flex shrink-0 items-center">
                          <button
                            type="button"
                            aria-label={`Editar ${meal.name}`}
                            onClick={() => setSheetFor({ meal })}
                            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover ${meal.name}`}
                            onClick={() => setDeleteTarget(meal)}
                            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {meal.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {meal.items.map((item, i) => (
                            <span
                              key={i}
                              className="rounded-[8px] border border-border/60 bg-background px-2 py-1 text-[11px] leading-none text-foreground"
                            >
                              {item.name}
                              {item.qty && (
                                <span className="ml-1 tabular-nums text-[10px] text-muted-foreground">{item.qty}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {(meal.kcal !== null || meal.protein_g !== null) && (
                        <span className="tabular-nums text-[10px] tabular-nums text-muted-foreground">
                          {meal.kcal !== null &&
                            `~${meal.kcal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kcal`}
                          {meal.kcal !== null && meal.protein_g !== null && " · "}
                          {meal.protein_g !== null &&
                            `${meal.protein_g.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} g proteína`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Compartilhar com o grupo */}
          <div data-tour-id="dieta-compartilhar" className="flex items-center gap-3 card-rim animate-fade-up p-4">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Mostrar dieta no grupo</span>
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

          {/* Banco de variações — alternativas de troca, sem vínculo com aderência */}
          <div data-tour-id="dieta-variacoes" className="flex flex-col gap-3 card-rim animate-fade-up p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="mono-label">Banco de variações</span>
              <button
                type="button"
                onClick={() => setVariationSheet({ variation: null })}
                className="flex items-center gap-1.5 rounded-[10px] border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
                Nova
              </button>
            </div>

            {varGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Alternativas de troca por categoria — café da manhã, proteínas, pré-treino — para variar sem sair da
                estratégia.
              </p>
            ) : (
              varGroups.map((group) => (
                <div key={group.category} className="flex flex-col gap-2">
                  <span className="mono-label border-b border-border/60 pb-1.5">{group.category}</span>
                  {group.variations.map((v) => (
                    <div key={v.id} className="flex flex-col gap-2 rounded-[13px] border border-border/60 bg-secondary/40 p-3">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{v.name}</span>
                        <div className="ml-auto flex shrink-0 items-center">
                          <button
                            type="button"
                            aria-label={`Editar ${v.name}`}
                            onClick={() => setVariationSheet({ variation: v })}
                            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover ${v.name}`}
                            onClick={() => setVariationDelete(v)}
                            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {v.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {v.items.map((item, i) => (
                            <span
                              key={i}
                              className="rounded-[8px] border border-border/60 bg-background px-2 py-1 text-[11px] leading-none text-foreground"
                            >
                              {item.name}
                              {item.qty && (
                                <span className="ml-1 tabular-nums text-[10px] text-muted-foreground">{item.qty}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.note && <span className="text-[10px] text-muted-foreground">{v.note}</span>}
                    </div>
                  ))}
                </div>
              ))
            )}
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

      {variationSheet && (
        <VariationSheet
          key={variationSheet.variation?.id ?? "nova"}
          variation={variationSheet.variation}
          categories={varCategories}
          open
          onOpenChange={(open) => !open && setVariationSheet(null)}
          onSave={handleSaveVariation}
          isPending={addVariation.isPending || updateVariation.isPending}
        />
      )}

      <AlertDialog open={!!variationDelete} onOpenChange={(open) => !open && setVariationDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold tracking-tight">Remover variação?</AlertDialogTitle>
            <AlertDialogDescription>
              {variationDelete?.name} sai do banco de variações. Isso não mexe no plano nem na aderência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold tracking-tight">Remover do plano?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} sai do plano a partir de hoje. O histórico dos dias já marcados continua intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
