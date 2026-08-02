import type { ProfileInfo } from "@/hooks/useProfilesInGroup";

export type ChallengeInfo = {
  id: string;
  title: string;
  emoji: string;
  target: number | null;
  starts_at: string; // date (yyyy-mm-dd)
  ends_at: string;
  created_by: string;
};

export type ChallengeStatus = "upcoming" | "active" | "ended";

export type ChallengeScore = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  count: number;
  position: number;
  /** Bateu a meta individual (quando o desafio tem meta). */
  hitTarget: boolean;
};

/** Interpreta a date column no fuso local (evita o off-by-one do Date UTC). */
function localDate(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
}

export function challengeStatus(c: Pick<ChallengeInfo, "starts_at" | "ends_at">, now: Date = new Date()): ChallengeStatus {
  if (now < localDate(c.starts_at)) return "upcoming";
  if (now > localDate(c.ends_at, true)) return "ended";
  return "active";
}

/** Dias restantes contando o dia atual (1 no último dia; 0 se encerrado). */
export function daysLeft(c: Pick<ChallengeInfo, "ends_at">, now: Date = new Date()): number {
  const end = localDate(c.ends_at, true);
  if (now > end) return 0;
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/** Duração total do desafio em dias (inclusivo). */
export function totalDays(c: Pick<ChallengeInfo, "starts_at" | "ends_at">): number {
  return Math.round((localDate(c.ends_at).getTime() - localDate(c.starts_at).getTime()) / 86_400_000) + 1;
}

/**
 * Placar do desafio: treinos dos participantes dentro do período.
 * Empate divide posição (1, 1, 3), igual ao ranking.
 */
export function computeChallengeScores(
  challenge: ChallengeInfo,
  participantIds: string[],
  workouts: { user_id: string; workout_date: string }[],
  profilesByUserId: Record<string, ProfileInfo>,
): ChallengeScore[] {
  const start = localDate(challenge.starts_at);
  const end = localDate(challenge.ends_at, true);
  const inWindow = workouts.filter((w) => {
    const d = new Date(w.workout_date);
    return d >= start && d <= end;
  });
  const countByUser: Record<string, number> = {};
  for (const id of participantIds) countByUser[id] = 0;
  for (const w of inWindow) {
    if (w.user_id in countByUser) countByUser[w.user_id]++;
  }
  const entries = Object.entries(countByUser)
    .map(([user_id, count]) => ({
      user_id,
      display_name: profilesByUserId[user_id]?.display_name ?? "Sem nome",
      avatar_url: profilesByUserId[user_id]?.avatar_url ?? null,
      count,
      position: 0,
      hitTarget: challenge.target !== null && count >= challenge.target,
    }))
    .sort((a, b) => b.count - a.count || a.display_name.localeCompare(b.display_name));
  entries.forEach((e, i) => {
    e.position = i > 0 && entries[i - 1].count === e.count ? entries[i - 1].position : i + 1;
  });
  return entries;
}

/** Campeões de um desafio encerrado (empate = mais de um). */
export function challengeWinners(scores: ChallengeScore[]): ChallengeScore[] {
  if (scores.length === 0 || scores[0].count === 0) return [];
  return scores.filter((s) => s.position === 1);
}

/** Frase de provocação do desafio, do ponto de vista do usuário. */
export function challengeCallout(
  scores: ChallengeScore[],
  myUserId: string | undefined,
  status: ChallengeStatus,
  target: number | null,
): string | null {
  if (status === "upcoming") return "Ainda não começou. Prepare o shape.";
  const me = scores.find((s) => s.user_id === myUserId);
  if (status === "ended") {
    const winners = challengeWinners(scores);
    if (winners.length === 0) return "Ninguém pontuou. Fica pro próximo.";
    const names = winners.map((w) => (w.user_id === myUserId ? "Você" : w.display_name)).join(" e ");
    return winners.some((w) => w.user_id === myUserId) ? `${names} levou o desafio! 🏆` : `${names} levou o desafio.`;
  }
  if (!me) return null;
  if (target !== null) {
    const missing = target - me.count;
    if (missing <= 0) return "Meta batida! Agora é defender o topo.";
    return missing === 1 ? "Falta 1 treino pra bater a meta." : `Faltam ${missing} treinos pra bater a meta.`;
  }
  const leader = scores[0];
  if (me.position === 1) {
    return scores.length > 1 && scores[1].count === me.count
      ? "Empate na ponta. O próximo treino desempata."
      : "Você lidera o desafio. Segura a ponta.";
  }
  const diff = leader.count - me.count;
  return diff === 1 ? `1 treino te separa de ${leader.display_name}.` : `${diff} treinos te separam de ${leader.display_name}.`;
}
