import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  challengeStatus,
  daysLeft,
  totalDays,
  computeChallengeScores,
  challengeWinners,
  challengeCallout,
  type ChallengeInfo,
} from "@/lib/challenges";
import type { Challenge } from "@/hooks/useChallenges";
import type { ProfileInfo } from "@/hooks/useProfilesInGroup";
import { InitialAvatar } from "@/components/InitialAvatar";
import { cn } from "@/lib/utils";
import { Check, Crown, Hourglass, Swords, Target, Trash2, Trophy } from "lucide-react";

type ChallengeCardProps = {
  challenge: Challenge;
  workouts: { user_id: string; workout_date: string }[];
  profilesMap: Record<string, ProfileInfo>;
  userId: string | undefined;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  isJoining: boolean;
};

function localDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Card do desafio: countdown, provocação, placar com barras e coroa. */
export function ChallengeCard({
  challenge,
  workouts,
  profilesMap,
  userId,
  onJoin,
  onLeave,
  onDelete,
  isJoining,
}: ChallengeCardProps) {
  const info: ChallengeInfo = challenge;
  const participantIds = challenge.challenge_participants.map((p) => p.user_id);
  const status = challengeStatus(info);
  const scores = computeChallengeScores(info, participantIds, workouts, profilesMap);
  const winners = challengeWinners(scores);
  const callout = challengeCallout(scores, userId, status, challenge.target);
  const left = daysLeft(info);
  const total = totalDays(info);
  const elapsedPct = status === "ended" ? 100 : status === "upcoming" ? 0 : Math.min(100, ((total - left) / total) * 100 + 100 / total);
  const amIn = userId !== undefined && participantIds.includes(userId);
  const isCreator = userId === challenge.created_by;
  const maxCount = Math.max(1, challenge.target ?? 0, scores[0]?.count ?? 1);
  const lastDay = status === "active" && left === 1;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border bg-gradient-to-b from-secondary to-card",
        status === "active" ? "border-accent/40" : "border-border",
        status === "ended" && "opacity-90",
      )}
    >
      {status === "active" && (
        <div className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(200px_120px_at_85%_0%,hsl(var(--accent)/0.15),transparent_70%)] [animation-duration:4s]" />
      )}

      <div className="relative flex flex-col gap-3 p-4">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-background/60 text-2xl">
            {challenge.emoji}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="display-title truncate text-base text-foreground">{challenge.title}</span>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {format(localDay(challenge.starts_at), "dd MMM", { locale: ptBR })} –{" "}
              {format(localDay(challenge.ends_at), "dd MMM", { locale: ptBR })}
              {challenge.target !== null && ` · meta ${challenge.target}`}
            </span>
          </div>
          {status === "ended" ? (
            <span className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em] text-muted-foreground">
              <Trophy className="h-3 w-3" />
              ENCERRADO
            </span>
          ) : status === "upcoming" ? (
            <span className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em] text-muted-foreground">
              <Hourglass className="h-3 w-3" />
              EM BREVE
            </span>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em]",
                lastDay ? "animate-glow-pulse bg-accent text-accent-foreground [animation-duration:1.6s]" : "bg-accent/15 text-accent",
              )}
            >
              <Hourglass className="h-3 w-3" />
              {lastDay ? "ÚLTIMO DIA" : `${left} DIAS`}
            </span>
          )}
        </div>

        {/* Linha do tempo */}
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-background/60">
          <div
            className={cn("h-full origin-left animate-bar-in rounded-[3px]", status === "ended" ? "bg-muted-foreground/40" : "bg-accent")}
            style={{ width: `${elapsedPct}%` }}
          />
        </div>

        {/* Provocação */}
        {callout && (
          <div className="flex items-center gap-2 rounded-[11px] border border-accent/25 bg-accent/10 px-3 py-2">
            <Swords className="h-4 w-4 shrink-0 text-accent" />
            <span className="flex-1 text-xs font-semibold leading-snug text-accent">{callout}</span>
          </div>
        )}

        {/* Placar */}
        {scores.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {scores.slice(0, 5).map((s) => {
              const isMe = s.user_id === userId;
              const isChampion = status === "ended" && winners.some((w) => w.user_id === s.user_id);
              const isLeader = status !== "ended" && s.position === 1 && s.count > 0;
              return (
                <div key={s.user_id} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-1.5", isMe && "bg-primary/5")}>
                  <span className="w-5 text-center font-mono text-xs font-bold text-muted-foreground">{s.position}</span>
                  <InitialAvatar name={s.display_name} avatarUrl={s.avatar_url} isSelf={isMe} className="h-7 w-7 rounded-lg text-[11px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("flex items-center gap-1.5 truncate text-xs font-bold", isMe ? "text-primary" : "text-foreground")}>
                        {isMe ? "Você" : s.display_name}
                        {(isChampion || isLeader) && <Crown className="h-3.5 w-3.5 shrink-0 fill-primary/30 text-primary" />}
                        {s.hitTarget && (
                          <span className="flex items-center gap-0.5 rounded bg-primary/15 px-1 py-0.5 font-mono text-[8px] font-bold tracking-[0.08em] text-primary">
                            <Check className="h-2.5 w-2.5" strokeWidth={4} />
                            META
                          </span>
                        )}
                      </span>
                      <span className={cn("font-mono text-xs font-bold tabular-nums", s.position === 1 ? "text-primary" : "text-muted-foreground")}>
                        {s.count}
                        {challenge.target !== null && <span className="text-muted-foreground/50">/{challenge.target}</span>}
                      </span>
                    </div>
                    <div className="relative h-[5px] overflow-hidden rounded-[3px] bg-background/60">
                      <div
                        className={cn(
                          "h-full origin-left animate-bar-in rounded-[3px]",
                          s.hitTarget ? "bg-primary" : s.position === 1 && s.count > 0 ? "bg-primary" : "bg-muted-foreground/40",
                        )}
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                      {challenge.target !== null && (
                        <span
                          className="absolute bottom-0 top-0 w-px bg-foreground/40"
                          style={{ left: `${(challenge.target / maxCount) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {scores.length > 5 && (
              <span className="text-center font-mono text-[10px] text-muted-foreground/60">+{scores.length - 5} participantes</span>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2">
          {!amIn && status !== "ended" ? (
            <button
              type="button"
              disabled={isJoining}
              onClick={onJoin}
              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-3 text-[13px] font-extrabold text-primary-foreground shadow-hard-sm active-hard disabled:opacity-50"
            >
              <span className="absolute left-0 top-0 h-full w-2/5 animate-sheen bg-gradient-to-r from-transparent via-white/50 to-transparent [animation-duration:3s]" />
              <Target className="h-4 w-4" />
              Entrar no desafio
            </button>
          ) : (
            <span className="flex-1" />
          )}
          {amIn && status !== "ended" && (
            <button type="button" onClick={onLeave} className="text-[11px] font-bold text-muted-foreground/60 hover:text-destructive">
              Sair
            </button>
          )}
          {isCreator && (
            <button
              type="button"
              aria-label="Excluir desafio"
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
