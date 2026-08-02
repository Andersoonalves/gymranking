import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  /** Texto grande no lugar do ícone (ex.: "404"). */
  figure?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Estado vazio padrão: ícone apagado, título forte, texto curto e uma saída. */
export function EmptyState({ icon: Icon, figure, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-8 text-center",
        className,
      )}
    >
      {figure ? (
        <span className="font-mono text-5xl font-bold text-primary">{figure}</span>
      ) : Icon ? (
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground/50">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <span className="text-base font-extrabold text-foreground">{title}</span>
      {description && <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
