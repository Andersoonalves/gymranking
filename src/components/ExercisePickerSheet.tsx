import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EXERCISES_BY_MUSCLE_GROUP } from "@/lib/exercises";
import { MUSCLE_GROUPS } from "@/lib/workout-types";
import { cn } from "@/lib/utils";
import { ChevronLeft, PenLine, Plus, Search } from "lucide-react";

type ExercisePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado com o nome do exercício escolhido (da lista ou personalizado). */
  onPick: (name: string) => void;
};

/** Drill-down de exercícios: grupo muscular → exercício, com busca global. */
export function ExercisePickerSheet({ open, onOpenChange, onPick }: ExercisePickerSheetProps) {
  const [group, setGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGroup(null);
      setSearch("");
      setCustomMode(false);
      setCustomName("");
    }
    onOpenChange(next);
  };

  const pick = (name: string) => {
    onPick(name);
    handleOpenChange(false);
  };

  const query = search.trim().toLowerCase();

  // Busca global cruza todos os grupos; sem busca, lista o grupo escolhido.
  const results = useMemo(() => {
    if (query) {
      const out: { name: string; group: string }[] = [];
      for (const [g, list] of Object.entries(EXERCISES_BY_MUSCLE_GROUP)) {
        if (group && g !== group) continue;
        for (const ex of list) {
          if (ex.pt.toLowerCase().includes(query) || ex.en.toLowerCase().includes(query)) {
            out.push({ name: ex.pt, group: g });
          }
        }
      }
      return out.slice(0, 40);
    }
    if (group) {
      return (EXERCISES_BY_MUSCLE_GROUP[group] ?? []).map((ex) => ({ name: ex.pt, group }));
    }
    return [];
  }, [query, group]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
      >
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex items-center gap-2.5">
            {group && (
              <button
                type="button"
                aria-label="Voltar aos grupos"
                onClick={() => setGroup(null)}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border bg-secondary text-foreground hover:text-primary"
              >
                <ChevronLeft className="h-[19px] w-[19px]" />
              </button>
            )}
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="mono-label">{group ? `Exercícios · ${group}` : "Exercícios"}</span>
              <SheetTitle className="display-title text-xl text-foreground">Escolher exercício</SheetTitle>
            </div>
            {group && (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {EXERCISES_BY_MUSCLE_GROUP[group]?.length ?? 0}
              </span>
            )}
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-[11px] border bg-background px-3 py-[11px]",
              query ? "border-primary" : "border-border",
            )}
          >
            <Search className={cn("h-[18px] w-[18px]", query ? "text-primary" : "text-muted-foreground/60")} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exercício…"
              className="w-full bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {!query && !group && (
            <div className="grid grid-cols-2 gap-1.5">
              {MUSCLE_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className="flex items-center justify-between rounded-[13px] border border-border bg-secondary/60 px-3.5 py-3 text-left hover:border-primary"
                >
                  <span className="text-[13px] font-bold text-foreground">{g}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    {EXERCISES_BY_MUSCLE_GROUP[g]?.length ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {(query || group) && (
            <div className="flex flex-col gap-1.5">
              {results.map((ex) => (
                <button
                  key={`${ex.group}-${ex.name}`}
                  type="button"
                  onClick={() => pick(ex.name)}
                  className="flex items-center gap-3 rounded-[13px] border border-border/60 bg-secondary/40 p-2.5 text-left hover:border-primary"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-bold text-foreground">{ex.name}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground/70">{ex.group}</span>
                  </div>
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground/60">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))}
              {results.length === 0 && (
                <span className="py-3 text-center text-xs text-muted-foreground">Nenhum exercício encontrado.</span>
              )}
            </div>
          )}

          {customMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && customName.trim() && pick(customName.trim())}
                placeholder="Nome do exercício"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={!customName.trim()}
                onClick={() => pick(customName.trim())}
                className="rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-hard-sm active-hard disabled:opacity-50"
              >
                Usar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-3.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
            >
              <PenLine className="h-4 w-4" />
              Criar exercício personalizado
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
