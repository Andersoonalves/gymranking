import { useState } from "react";
import { useChallenges, useCreateChallenge, useJoinChallenge, useLeaveChallenge, useDeleteChallenge } from "@/hooks/useChallenges";
import { challengeStatus } from "@/lib/challenges";
import type { ProfileInfo } from "@/hooks/useProfilesInGroup";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CreateChallengeSheet } from "@/components/CreateChallengeSheet";
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
import { ChevronDown, Plus, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChallengesSectionProps = {
  groupId: string | undefined;
  userId: string | undefined;
  workouts: { user_id: string; workout_date: string }[];
  profilesMap: Record<string, ProfileInfo>;
};

/** Seção de desafios do grupo: ativos em destaque, encerrados colapsados. */
export function ChallengesSection({ groupId, userId, workouts, profilesMap }: ChallengesSectionProps) {
  const { data: challenges = [] } = useChallenges(groupId);
  const createChallenge = useCreateChallenge(groupId, userId);
  const joinChallenge = useJoinChallenge(groupId, userId);
  const leaveChallenge = useLeaveChallenge(groupId, userId);
  const deleteChallenge = useDeleteChallenge(groupId);

  const [createOpen, setCreateOpen] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const running = challenges.filter((c) => challengeStatus(c) !== "ended");
  const ended = challenges.filter((c) => challengeStatus(c) === "ended").slice(0, 3);

  const cardActions = (id: string, title: string) => ({
    onJoin: () =>
      joinChallenge.mutate(id, {
        onSuccess: () => toast.success("Você entrou no desafio. Agora não tem volta."),
        onError: () => toast.error("Erro ao entrar no desafio"),
      }),
    onLeave: () =>
      leaveChallenge.mutate(id, {
        onSuccess: () => toast.success("Você saiu do desafio."),
        onError: () => toast.error("Erro ao sair do desafio"),
      }),
    onDelete: () => setDeleteTarget({ id, title }),
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="mono-label">Desafios</span>
        {running.length > 0 && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo
          </button>
        )}
      </div>

      {running.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          workouts={workouts}
          profilesMap={profilesMap}
          userId={userId}
          isJoining={joinChallenge.isPending}
          {...cardActions(c.id, c.title)}
        />
      ))}

      {running.length === 0 && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-gradient-to-br from-secondary/60 to-card p-4 text-left hover:border-accent"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-accent/15">
            <Swords className="h-5 w-5 text-accent" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-extrabold text-foreground">Lançar um desafio</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              Prazo, meta e placar próprio. Quem treina mais, leva.
            </span>
          </span>
          <Plus className="h-5 w-5 shrink-0 text-accent" />
        </button>
      )}

      {ended.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowEnded((v) => !v)}
            className="flex items-center justify-center gap-1.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 hover:text-muted-foreground"
          >
            Encerrados ({ended.length})
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showEnded && "rotate-180")} />
          </button>
          {showEnded &&
            ended.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                workouts={workouts}
                profilesMap={profilesMap}
                userId={userId}
                isJoining={false}
                {...cardActions(c.id, c.title)}
              />
            ))}
        </>
      )}

      <CreateChallengeSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(params) => createChallenge.mutateAsync(params)}
        isPending={createChallenge.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Excluir {deleteTarget?.title}?</AlertDialogTitle>
            <AlertDialogDescription>O desafio e o placar dele somem para todo o grupo. Isso não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                deleteChallenge.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success("Desafio excluído.");
                    setDeleteTarget(null);
                  },
                  onError: () => toast.error("Erro ao excluir desafio"),
                });
              }}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              {deleteChallenge.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
