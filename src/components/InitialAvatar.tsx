import { cn } from "@/lib/utils";

const palettes = [
  "bg-chart-3 text-background",
  "bg-accent text-accent-foreground",
  "bg-primary text-primary-foreground",
  "bg-chart-4 text-background",
  "bg-muted-foreground text-background",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}

type InitialAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  /** Destaque do próprio usuário: gradiente laranja→lima do protótipo. */
  isSelf?: boolean;
  className?: string;
};

/** Avatar quadrado arredondado com fallback de inicial — padrão do sistema Placar. */
export function InitialAvatar({ name, avatarUrl, isSelf, className }: InitialAvatarProps) {
  const base = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] font-black uppercase",
    className,
  );
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cn(base, "object-cover")} />;
  }
  return (
    <div
      className={cn(
        base,
        isSelf
          ? "bg-gradient-to-br from-accent to-primary text-background"
          : colorFor(name),
      )}
    >
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}
