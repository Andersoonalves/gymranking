import { inviteLink } from "@/lib/invite";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

type ShareInviteButtonProps = {
  groupName: string;
  inviteCode: string;
  className?: string;
};

/** Compartilha o link de convite via share nativo; sem suporte, copia o link. */
export function ShareInviteButton({ groupName, inviteCode, className }: ShareInviteButtonProps) {
  const share = async () => {
    const url = inviteLink(inviteCode, window.location.origin);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entre no ${groupName} no FitRank`,
          text: `Bora disputar o ranking de treinos em ${groupName}!`,
          url,
        });
        return;
      } catch {
        // usuário cancelou o share nativo — não copiar por cima
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado!");
  };

  return (
    <button type="button" aria-label="Compartilhar link de convite" onClick={share} className={className}>
      <Share2 className="h-4 w-4" />
    </button>
  );
}
