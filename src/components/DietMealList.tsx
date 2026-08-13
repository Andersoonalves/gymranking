import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { DietItem, DietMeal } from "@/lib/diet";

/** Itens da refeição: nome à esquerda, quantidade à direita. */
function ItemList({ items, done }: { items: DietItem[]; done: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-2 text-[12px] leading-snug">
          <span
            className={cn(
              "h-1 w-1 shrink-0 translate-y-[-2px] rounded-full",
              done ? "bg-primary/60" : "bg-muted-foreground/40",
            )}
          />
          <span className="min-w-0 flex-1 text-muted-foreground">{item.name}</span>
          {item.qty && <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">{item.qty}</span>}
        </li>
      ))}
    </ul>
  );
}

type DietMealListProps = {
  meals: DietMeal[];
  /** Ids das refeições cumpridas no dia mostrado. */
  doneIds: Set<string>;
  /** Sem callback a lista é só leitura — é assim que o grupo vê a dieta de outro. */
  onToggle?: (meal: DietMeal, done: boolean) => void;
  className?: string;
};

/** Refeições de um dia com seus itens. Usada na aba Dieta e no perfil do membro. */
export function DietMealList({ meals, doneIds, onToggle, className }: DietMealListProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {meals.map((meal) => {
        const done = doneIds.has(meal.id);
        const mark = (
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2",
              done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
              onToggle && !done && "transition-colors hover:border-primary",
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        );
        return (
          <div
            key={meal.id}
            className={cn(
              "flex items-start gap-3 rounded-[18px] border p-4 transition-colors",
              done ? "border-primary/50 bg-primary/5" : "border-border bg-card",
            )}
          >
            {onToggle ? (
              <button
                type="button"
                aria-label={done ? `Desmarcar ${meal.name}` : `Marcar ${meal.name}`}
                aria-pressed={done}
                onClick={() => onToggle(meal, !done)}
              >
                {mark}
              </button>
            ) : (
              mark
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={cn("truncate text-sm font-extrabold", done ? "text-primary" : "text-foreground")}>
                  {meal.name}
                </span>
                {meal.time_of_day && (
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                    {meal.time_of_day.slice(0, 5)}
                  </span>
                )}
                {meal.kcal !== null && (
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
                    {meal.kcal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kcal
                  </span>
                )}
              </div>
              <ItemList items={meal.items} done={done} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
