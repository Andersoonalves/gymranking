import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useSaveProfile } from "@/hooks/useMyProfile";
import { AvatarUpload } from "@/components/AvatarUpload";
import { BrandMark } from "@/components/BrandMark";
import { EcgBackground } from "@/components/EcgBackground";
import { isProfileComplete } from "@/lib/profile";
import { errorMessage } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Barreira antes do app: sem nome e foto a pessoa vira "Sem nome" no ranking
 * do grupo. Vale para conta nova e para quem já estava cadastrado sem perfil.
 */
export default function CompleteProfile() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { data: profile } = useMyProfile(userId);
  const saveProfile = useSaveProfile(userId);

  // Nome com "@" é o e-mail que o trigger pôs de fallback: não sugere.
  const suggestedName = [profile?.display_name, user?.user_metadata?.full_name, user?.user_metadata?.name].find(
    (n): n is string => typeof n === "string" && n.trim().length > 0 && !n.includes("@"),
  );
  const [displayName, setDisplayName] = useState(suggestedName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);

  const ready = isProfileComplete({ display_name: displayName, avatar_url: avatarUrl });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !avatarUrl) return;
    try {
      await saveProfile.mutateAsync({ display_name: displayName.trim(), avatar_url: avatarUrl });
      toast.success("Perfil pronto!");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o perfil"));
    }
  };

  if (!userId) return null;

  return (
    <div className="dark relative min-h-dvh overflow-hidden bg-[#0A0907] text-foreground">
      <EcgBackground />

      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-7 py-12 safe-area-bottom"
      >
        <div className="flex flex-col gap-3.5">
          <BrandMark className="h-[52px] w-[52px] rounded-[17px] shadow-[0_0_44px_-6px_hsl(var(--primary)/0.6)]" />
          <div className="flex flex-col gap-2">
            <h1 className="display-title text-4xl leading-[0.95] tracking-[-0.05em]">Complete seu perfil</h1>
            <p className="max-w-[320px] text-[15px] leading-normal text-muted-foreground">
              Seu grupo precisa saber quem está no placar. Coloque seu nome e uma foto para continuar.
            </p>
          </div>
        </div>

        <AvatarUpload userId={userId} currentUrl={avatarUrl} displayName={displayName} onUploaded={setAvatarUrl} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="display-name" className="mono-label">
            Nome
          </label>
          <input
            id="display-name"
            type="text"
            placeholder="Como o grupo te chama"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            autoComplete="name"
            className="rounded-[13px] border border-border bg-card/80 p-4 text-sm font-medium text-foreground outline-none backdrop-blur-md placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.45)]"
          />
        </div>

        <button
          type="submit"
          disabled={!ready || saveProfile.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary p-4 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {saveProfile.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continuar"}
        </button>
        {!avatarUrl && <p className="-mt-3 text-center text-xs text-muted-foreground">A foto é obrigatória.</p>}

        <button
          type="button"
          onClick={signOut}
          className="text-center text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}
