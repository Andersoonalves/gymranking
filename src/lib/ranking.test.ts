import { describe, it, expect } from "vitest";
import {
  getPeriodBounds,
  filterWorkoutsByPeriod,
  computeRanking,
  computeStreak,
  longestStreak,
  formatPeriodCountdown,
  buildCallout,
  getMedalEmoji,
} from "./ranking";
import type { ProfileInfo } from "@/hooks/useProfilesInGroup";

// Quarta-feira, 29/07/2026. Construído em horário local de propósito:
// workout_date é timestamptz, então comparações acontecem no fuso do cliente.
const REF = new Date(2026, 6, 29, 12, 0, 0);

const at = (...args: [number, number, number, number?]) =>
  new Date(...(args as [number, number, number, number])).toISOString();

describe("getPeriodBounds", () => {
  it("semana começa na segunda e termina no domingo", () => {
    const { start, end } = getPeriodBounds("week", REF);
    expect(start.getDay()).toBe(1); // segunda
    expect(end.getDay()).toBe(0); // domingo
    expect(start.getDate()).toBe(27);
    expect(end.getDate()).toBe(2);
    expect(end.getMonth()).toBe(7); // agosto — período atravessa o mês
  });

  it("mês cobre o primeiro ao último dia", () => {
    const { start, end } = getPeriodBounds("month", REF);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(6);
    expect(end.getDate()).toBe(31);
    expect(end.getMonth()).toBe(6);
  });

  it("ano cobre 1º de janeiro a 31 de dezembro", () => {
    const { start, end } = getPeriodBounds("year", REF);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });

  it("fim do período inclui o último milissegundo do dia", () => {
    const { end } = getPeriodBounds("month", REF);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});

describe("filterWorkoutsByPeriod", () => {
  const workouts = [
    { id: "seg", workout_date: at(2026, 6, 27, 8) }, // início da semana
    { id: "qua", workout_date: at(2026, 6, 29, 20) },
    { id: "dom", workout_date: at(2026, 7, 2, 23) }, // fim da semana (agosto)
    { id: "semana-passada", workout_date: at(2026, 6, 26, 10) },
    { id: "ano-passado", workout_date: at(2025, 6, 29, 10) },
  ];

  it("semana inclui as bordas e exclui o dia anterior", () => {
    const ids = filterWorkoutsByPeriod(workouts, "week", REF).map((w) => w.id);
    expect(ids).toEqual(["seg", "qua", "dom"]);
  });

  it("mês não inclui treino de agosto", () => {
    const ids = filterWorkoutsByPeriod(workouts, "month", REF).map((w) => w.id);
    expect(ids).toEqual(["seg", "qua", "semana-passada"]);
  });

  it("ano exclui registro de 2025", () => {
    const ids = filterWorkoutsByPeriod(workouts, "year", REF).map((w) => w.id);
    expect(ids).not.toContain("ano-passado");
    expect(ids).toHaveLength(4);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(filterWorkoutsByPeriod([], "week", REF)).toEqual([]);
  });
});

describe("computeRanking", () => {
  const profiles: Record<string, ProfileInfo> = {
    a: { display_name: "Ana", avatar_url: "ana.png" },
    b: { display_name: "Bruno", avatar_url: null },
  };

  it("conta treinos por usuário e ordena do maior para o menor", () => {
    const r = computeRanking(
      [{ user_id: "b" }, { user_id: "a" }, { user_id: "a" }, { user_id: "a" }],
      profiles
    );
    expect(r.map((e) => [e.user_id, e.count, e.position])).toEqual([
      ["a", 3, 1],
      ["b", 1, 2],
    ]);
  });

  it("hidrata nome e avatar do perfil", () => {
    const [ana] = computeRanking([{ user_id: "a" }], profiles);
    expect(ana.display_name).toBe("Ana");
    expect(ana.avatar_url).toBe("ana.png");
  });

  it("usa fallback quando o perfil não existe no grupo", () => {
    const [fantasma] = computeRanking([{ user_id: "z" }], profiles);
    expect(fantasma.display_name).toBe("Sem nome");
    expect(fantasma.avatar_url).toBeNull();
  });

  it("sem treinos, ranking vazio", () => {
    expect(computeRanking([], profiles)).toEqual([]);
  });

  it("empate mantém a mesma posição para contagens iguais", () => {
    const r = computeRanking(
      [{ user_id: "a" }, { user_id: "a" }, { user_id: "b" }, { user_id: "b" }, { user_id: "c" }],
      profiles
    );
    expect(r[0].count).toBe(2);
    expect(r[1].count).toBe(2);
    expect(r[0].position).toBe(1);
    expect(r[1].position).toBe(1);
    // posição pula para 3 depois de dois empatados em 1º
    expect(r[2].position).toBe(3);
  });
});

describe("getMedalEmoji", () => {
  it("devolve medalha para o pódio", () => {
    expect(getMedalEmoji(1)).toBe("🥇");
    expect(getMedalEmoji(2)).toBe("🥈");
    expect(getMedalEmoji(3)).toBe("🥉");
  });

  it("devolve null fora do pódio", () => {
    expect(getMedalEmoji(4)).toBeNull();
    expect(getMedalEmoji(0)).toBeNull();
  });
});

describe("computeStreak", () => {
  const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

  it("conta dias seguidos terminando hoje", () => {
    const dates = [iso(2026, 6, 27), iso(2026, 6, 28), iso(2026, 6, 29)];
    expect(computeStreak(dates, REF)).toBe(3);
  });

  it("sem treino hoje, a sequência de ontem ainda vale", () => {
    const dates = [iso(2026, 6, 27), iso(2026, 6, 28)];
    expect(computeStreak(dates, REF)).toBe(2);
  });

  it("buraco de um dia quebra a sequência", () => {
    const dates = [iso(2026, 6, 25), iso(2026, 6, 26), iso(2026, 6, 29)];
    expect(computeStreak(dates, REF)).toBe(1);
  });

  it("dois treinos no mesmo dia contam um dia só", () => {
    const dates = [iso(2026, 6, 29), iso(2026, 6, 29)];
    expect(computeStreak(dates, REF)).toBe(1);
  });

  it("sem treinos, streak zero", () => {
    expect(computeStreak([], REF)).toBe(0);
  });
});

describe("buildCallout", () => {
  const profiles: Record<string, ProfileInfo> = {
    a: { display_name: "Duda", avatar_url: null },
    b: { display_name: "Rafa", avatar_url: null },
  };
  const ranking = computeRanking(
    [{ user_id: "a" }, { user_id: "a" }, { user_id: "a" }, { user_id: "b" }],
    profiles
  );

  it("líder recebe provocação de liderança", () => {
    expect(buildCallout(ranking, "a")).toBe("Você lidera a semana. Não deixe escapar.");
  });

  it("quem está atrás vê a distância até o líder", () => {
    expect(buildCallout(ranking, "b")).toBe("Você está a 2 treinos de Duda.");
  });

  it("quem não pontuou é chamado a registrar", () => {
    expect(buildCallout(ranking, "c")).toBe("Duda lidera com 3. Registre o seu primeiro.");
  });

  it("empate na liderança vira chamada de desempate", () => {
    const tied = computeRanking([{ user_id: "a" }, { user_id: "b" }], profiles);
    expect(buildCallout(tied, "a")).toBe("Empate na liderança. O próximo treino desempata.");
  });

  it("ranking vazio devolve null", () => {
    expect(buildCallout([], "a")).toBeNull();
  });
});

describe("longestStreak", () => {
  it("sem treinos devolve 0", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("acha a maior sequência mesmo no passado", () => {
    expect(
      longestStreak([
        "2026-01-01T10:00:00",
        "2026-01-02T10:00:00",
        "2026-01-03T10:00:00",
        "2026-03-10T10:00:00",
        "2026-03-11T10:00:00",
      ])
    ).toBe(3);
  });

  it("dois treinos no mesmo dia contam uma vez", () => {
    expect(longestStreak(["2026-05-05T08:00:00", "2026-05-05T20:00:00", "2026-05-06T08:00:00"])).toBe(2);
  });
});

describe("formatPeriodCountdown", () => {
  it("dias e horas quando falta mais de um dia", () => {
    // terça 31/07/2026 09:40 → domingo 02/08 23:59
    expect(formatPeriodCountdown("week", new Date("2026-07-28T09:40:00"))).toBe("5d 14h");
  });

  it("horas e minutos no último dia", () => {
    expect(formatPeriodCountdown("week", new Date("2026-08-02T20:47:00"))).toBe("3h 12min");
  });

  it("só minutos na última hora", () => {
    expect(formatPeriodCountdown("week", new Date("2026-08-02T23:30:00"))).toBe("29min");
  });
});
