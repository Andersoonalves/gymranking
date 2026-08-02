import { describe, it, expect } from "vitest";
import {
  challengeStatus,
  daysLeft,
  totalDays,
  computeChallengeScores,
  challengeWinners,
  challengeCallout,
  type ChallengeInfo,
} from "./challenges";
import type { ProfileInfo } from "@/hooks/useProfilesInGroup";

const NOW = new Date(2026, 7, 2, 12, 0, 0); // 02/08/2026 meio-dia

const base: ChallengeInfo = {
  id: "c1",
  title: "Agosto insano",
  emoji: "🔥",
  target: null,
  starts_at: "2026-08-01",
  ends_at: "2026-08-31",
  created_by: "a",
};

const profiles: Record<string, ProfileInfo> = {
  a: { display_name: "Duda", avatar_url: null },
  b: { display_name: "Rafa", avatar_url: null },
  c: { display_name: "Vitor", avatar_url: null },
};

const w = (user: string, day: number) => ({
  user_id: user,
  workout_date: new Date(2026, 7, day, 10).toISOString(),
});

describe("challengeStatus", () => {
  it("distingue futuro, ativo e encerrado", () => {
    expect(challengeStatus({ starts_at: "2026-08-10", ends_at: "2026-08-20" }, NOW)).toBe("upcoming");
    expect(challengeStatus({ starts_at: "2026-08-01", ends_at: "2026-08-31" }, NOW)).toBe("active");
    expect(challengeStatus({ starts_at: "2026-07-01", ends_at: "2026-07-31" }, NOW)).toBe("ended");
  });

  it("último dia ainda é ativo até o fim do dia", () => {
    expect(challengeStatus({ starts_at: "2026-08-01", ends_at: "2026-08-02" }, NOW)).toBe("active");
  });
});

describe("daysLeft / totalDays", () => {
  it("conta o dia atual como restante", () => {
    expect(daysLeft({ ends_at: "2026-08-02" }, NOW)).toBe(1);
    expect(daysLeft({ ends_at: "2026-08-03" }, NOW)).toBe(2);
    expect(daysLeft({ ends_at: "2026-08-01" }, NOW)).toBe(0);
  });

  it("duração inclusiva", () => {
    expect(totalDays({ starts_at: "2026-08-01", ends_at: "2026-08-31" })).toBe(31);
    expect(totalDays({ starts_at: "2026-08-01", ends_at: "2026-08-01" })).toBe(1);
  });
});

describe("computeChallengeScores", () => {
  it("só conta treinos de participantes dentro da janela", () => {
    const workouts = [
      w("a", 1),
      w("a", 2),
      w("b", 2),
      w("c", 2), // não participa
      { user_id: "a", workout_date: new Date(2026, 6, 31, 10).toISOString() }, // fora da janela
    ];
    const scores = computeChallengeScores(base, ["a", "b"], workouts, profiles);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toMatchObject({ user_id: "a", count: 2, position: 1 });
    expect(scores[1]).toMatchObject({ user_id: "b", count: 1, position: 2 });
  });

  it("participante sem treino aparece com zero", () => {
    const scores = computeChallengeScores(base, ["a", "b"], [w("a", 1)], profiles);
    expect(scores[1]).toMatchObject({ user_id: "b", count: 0 });
  });

  it("marca quem bateu a meta", () => {
    const c = { ...base, target: 2 };
    const scores = computeChallengeScores(c, ["a", "b"], [w("a", 1), w("a", 2), w("b", 1)], profiles);
    expect(scores[0].hitTarget).toBe(true);
    expect(scores[1].hitTarget).toBe(false);
  });

  it("empate divide posição", () => {
    const scores = computeChallengeScores(base, ["a", "b", "c"], [w("a", 1), w("b", 1)], profiles);
    expect(scores[0].position).toBe(1);
    expect(scores[1].position).toBe(1);
    expect(scores[2].position).toBe(3);
  });
});

describe("challengeWinners", () => {
  it("sem pontos, sem campeão", () => {
    const scores = computeChallengeScores(base, ["a", "b"], [], profiles);
    expect(challengeWinners(scores)).toHaveLength(0);
  });

  it("empate rende dois campeões", () => {
    const scores = computeChallengeScores(base, ["a", "b"], [w("a", 1), w("b", 2)], profiles);
    expect(challengeWinners(scores)).toHaveLength(2);
  });
});

describe("challengeCallout", () => {
  const scores = computeChallengeScores(base, ["a", "b"], [w("a", 1), w("a", 2), w("b", 1)], profiles);

  it("líder ativo é provocado a segurar", () => {
    expect(challengeCallout(scores, "a", "active", null)).toBe("Você lidera o desafio. Segura a ponta.");
  });

  it("segundo lugar vê a distância", () => {
    expect(challengeCallout(scores, "b", "active", null)).toBe("1 treino te separa de Duda.");
  });

  it("com meta, mostra o que falta", () => {
    expect(challengeCallout(scores, "b", "active", 3)).toBe("Faltam 2 treinos pra bater a meta.");
    expect(challengeCallout(scores, "a", "active", 2)).toBe("Meta batida! Agora é defender o topo.");
  });

  it("encerrado anuncia o campeão", () => {
    expect(challengeCallout(scores, "b", "ended", null)).toBe("Duda levou o desafio.");
    expect(challengeCallout(scores, "a", "ended", null)).toBe("Você levou o desafio! 🏆");
  });
});
