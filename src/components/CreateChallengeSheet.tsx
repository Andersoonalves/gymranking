import { useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn, errorMessage } from "@/lib/utils";
import { Swords } from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["🔥", "⚡", "🏆", "💀", "🦍", "🎯", "🥊", "🚀"];
const DURATIONS = [
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mês", days: 30 },
];
const TARGETS: (number | null)[] = [null, 8, 12, 16, 20];

type CreateChallengeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (params: { title: string; emoji: string; target: number | null; starts_at: string; ends_at: string }) => Promise<unknown>;
  isPending: boolean;
};

/** Criação de desafio: nome, símbolo, duração e meta opcional — 4 toques e vai. */
export function CreateChallengeSheet({ open, onOpenChange, onCreate, isPending }: CreateChallengeSheetProps) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [days, setDays] = useState(14);
  const [target, setTarget] = useState<number | null>(null);

  const startsAt = new Date();
  const endsAt = addDays(startsAt, days - 1);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("");
      setEmoji("🔥");
      setDays(14);
      setTarget(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Dê um nome pro desafio");
      return;
    }
    try {
      await onCreate({
        title: title.trim(),
        emoji,
        target,
        starts_at: format(startsAt, "yyyy-MM-dd"),
        ends_at: format(endsAt, "yyyy-MM-dd"),
      });
      toast.success("Desafio lançado! Que vença o mais consistente.");
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao criar desafio"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-6 pt-3 safe-area-bottom">
          <div className="h-1 w-9 self-center rounded-full bg-border" />

          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-accent/15 text-2xl">{emoji}</span>
            <div className="flex flex-col gap-0.5">
              <SheetTitle className="display-title text-[22px] text-foreground">Lançar desafio</SheetTitle>
              <span className="text-xs text-muted-foreground">Quem treina mais até o fim, leva.</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="challenge-title" className="mono-label">
              Nome do desafio
            </label>
            <input
              id="challenge-title"
              type="text"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Agosto sem desculpa"
              className="rounded-xl border border-border bg-background p-3.5 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Símbolo</span>
            <div className="flex gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center rounded-[11px] border text-xl transition-transform",
                    emoji === e ? "scale-110 border-primary bg-primary/10" : "border-border bg-secondary/60",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Duração</span>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDays(d.days)}
                  className={cn(
                    "flex-1 rounded-[11px] py-3 text-xs",
                    days === d.days
                      ? "bg-primary font-extrabold text-primary-foreground"
                      : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase text-muted-foreground/70">
              Começa hoje · termina {format(endsAt, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Meta individual · opcional</span>
            <div className="flex gap-1.5">
              {TARGETS.map((t) => (
                <button
                  key={t ?? "none"}
                  type="button"
                  onClick={() => setTarget(t)}
                  className={cn(
                    "flex-1 rounded-[11px] py-3 font-mono text-xs",
                    target === t
                      ? "bg-primary font-bold text-primary-foreground"
                      : "border border-border bg-secondary/60 font-semibold text-muted-foreground",
                  )}
                >
                  {t === null ? "Livre" : t}
                </button>
              ))}
            </div>
            <span className="text-[11px] leading-snug text-muted-foreground/70">
              {target === null
                ? "Sem meta: vence quem somar mais treinos até o fim."
                : `Primeiro objetivo: ${target} treinos. Bater a meta ganha destaque — e o topo continua em disputa.`}
            </span>
          </div>

          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-primary p-[17px] text-[15px] font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
          >
            <span className="absolute left-0 top-0 h-full w-2/5 animate-sheen bg-gradient-to-r from-transparent via-white/55 to-transparent [animation-duration:3s]" />
            <Swords className="h-5 w-5" />
            {isPending ? "Lançando…" : "Lançar desafio"}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
