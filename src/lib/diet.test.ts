import { describe, it, expect } from "vitest";
import {
  toItems,
  mealsForDate,
  adherenceForDate,
  isGoodDay,
  adherenceStreak,
  rangeAdherence,
  macrosForDate,
  type DietMeal,
  type DietMealLog,
} from "./diet";

const meal = (over: Partial<DietMeal> & { id: string }): DietMeal => ({
  name: "Refeição",
  time_of_day: null,
  items: [],
  day_of_week: null,
  position: 0,
  kcal: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  effective_from: "2026-01-01",
  archived_at: null,
  ...over,
});

// 2026-08-12 é uma quarta-feira (dow 3).
const QUA = "2026-08-12";

describe("mealsForDate", () => {
  it("ordena por horário e joga refeição sem hora para o fim", () => {
    const meals = [
      meal({ id: "sem-hora", name: "Ceia" }),
      meal({ id: "almoco", time_of_day: "12:00:00" }),
      meal({ id: "cafe", time_of_day: "07:00:00" }),
    ];
    expect(mealsForDate(meals, QUA).map((m) => m.id)).toEqual(["cafe", "almoco", "sem-hora"]);
  });

  it("filtra por dia da semana", () => {
    const meals = [meal({ id: "quarta", day_of_week: 3 }), meal({ id: "domingo", day_of_week: 0 })];
    expect(mealsForDate(meals, QUA).map((m) => m.id)).toEqual(["quarta"]);
  });

  it("respeita a vigência: versão antiga vale no passado, nova vale depois", () => {
    const antiga = meal({ id: "v1", effective_from: "2026-08-01", archived_at: "2026-08-10" });
    const nova = meal({ id: "v2", effective_from: "2026-08-10" });
    expect(mealsForDate([antiga, nova], "2026-08-05").map((m) => m.id)).toEqual(["v1"]);
    expect(mealsForDate([antiga, nova], "2026-08-10").map((m) => m.id)).toEqual(["v2"]);
  });

  it("refeição arquivada no dia em que foi criada não vale em dia nenhum", () => {
    const errada = meal({ id: "erro", effective_from: QUA, archived_at: QUA });
    expect(mealsForDate([errada], QUA)).toEqual([]);
    expect(mealsForDate([errada], "2026-08-20")).toEqual([]);
  });
});

describe("adherenceForDate / isGoodDay", () => {
  const meals = [meal({ id: "a" }), meal({ id: "b" }), meal({ id: "c" }), meal({ id: "d" }), meal({ id: "e" })];

  it("conta só log do dia e da refeição prevista", () => {
    const logs: DietMealLog[] = [
      { meal_id: "a", log_date: QUA },
      { meal_id: "b", log_date: QUA },
      { meal_id: "c", log_date: "2026-08-11" },
    ];
    expect(adherenceForDate(meals, logs, QUA)).toEqual({ done: 2, total: 5, ratio: 0.4 });
  });

  it("80% já é dia bom; 79% não", () => {
    const quatro = ["a", "b", "c", "d"].map((meal_id) => ({ meal_id, log_date: QUA }));
    expect(isGoodDay(adherenceForDate(meals, quatro, QUA))).toBe(true);
    expect(isGoodDay(adherenceForDate(meals, quatro.slice(0, 3), QUA))).toBe(false);
  });

  it("dia sem refeição prevista não é dia bom", () => {
    expect(isGoodDay(adherenceForDate([], [], QUA))).toBe(false);
  });
});

describe("adherenceStreak", () => {
  const meals = [meal({ id: "a" }), meal({ id: "b" })];
  const cheio = (date: string): DietMealLog[] => [
    { meal_id: "a", log_date: date },
    { meal_id: "b", log_date: date },
  ];

  it("conta dias consecutivos cumpridos", () => {
    const logs = [...cheio(QUA), ...cheio("2026-08-11"), ...cheio("2026-08-10")];
    expect(adherenceStreak(meals, logs, QUA)).toBe(3);
  });

  it("hoje incompleto não quebra a sequência dos dias anteriores", () => {
    const logs = [...cheio("2026-08-11"), ...cheio("2026-08-10")];
    expect(adherenceStreak(meals, logs, QUA)).toBe(2);
  });

  it("dia ruim no passado zera dali para trás", () => {
    const logs = [...cheio(QUA), ...cheio("2026-08-10")];
    expect(adherenceStreak(meals, logs, QUA)).toBe(1);
  });

  it("dia sem plano é neutro e não quebra", () => {
    // Refeição só de quarta: terça não tem plano, quarta anterior tem.
    const soQuarta = [meal({ id: "q", day_of_week: 3 })];
    const logs = [
      { meal_id: "q", log_date: QUA },
      { meal_id: "q", log_date: "2026-08-05" },
    ];
    expect(adherenceStreak(soQuarta, logs, QUA)).toBe(2);
  });
});

describe("rangeAdherence", () => {
  it("ignora dias sem plano na conta", () => {
    const meals = [meal({ id: "q", day_of_week: 3 })];
    const logs = [{ meal_id: "q", log_date: QUA }];
    expect(rangeAdherence(meals, logs, "2026-08-10", "2026-08-16", QUA)).toEqual({ days: 1, goodDays: 1, ratio: 1 });
  });

  it("não conta dia que ainda não aconteceu", () => {
    const meals = [meal({ id: "a" })];
    const logs = [
      { meal_id: "a", log_date: "2026-08-10" },
      { meal_id: "a", log_date: "2026-08-11" },
      { meal_id: "a", log_date: QUA },
    ];
    // Semana 10..16, mas hoje é 12: o denominador é 3, não 7.
    expect(rangeAdherence(meals, logs, "2026-08-10", "2026-08-16", QUA)).toEqual({ days: 3, goodDays: 3, ratio: 1 });
  });

  it("intervalo todo no passado usa o fim informado", () => {
    const meals = [meal({ id: "a" })];
    const logs = [{ meal_id: "a", log_date: "2026-08-03" }];
    expect(rangeAdherence(meals, logs, "2026-08-03", "2026-08-04", QUA)).toEqual({
      days: 2,
      goodDays: 1,
      ratio: 0.5,
    });
  });
});

describe("macrosForDate", () => {
  it("soma e marca completo quando toda refeição tem kcal", () => {
    const meals = [meal({ id: "a", kcal: 500, protein_g: 30 }), meal({ id: "b", kcal: 700, protein_g: 40 })];
    expect(macrosForDate(meals, QUA)).toEqual({ complete: true, kcal: 1200, protein_g: 70, carbs_g: 0, fat_g: 0 });
  });

  it("marca incompleto se falta kcal em alguma", () => {
    const meals = [meal({ id: "a", kcal: 500 }), meal({ id: "b" })];
    expect(macrosForDate(meals, QUA).complete).toBe(false);
  });

  it("dia sem refeição não é completo", () => {
    expect(macrosForDate([], QUA).complete).toBe(false);
  });
});

describe("toItems", () => {
  it("aceita item com e sem quantidade", () => {
    expect(toItems([{ name: "Arroz", qty: "150 g" }, { name: "Salada" }])).toEqual([
      { name: "Arroz", qty: "150 g" },
      { name: "Salada", qty: null },
    ]);
  });

  it("descarta lixo em vez de quebrar a tela", () => {
    expect(toItems([{ name: "  " }, "arroz", null, 42, { qty: "150 g" }])).toEqual([]);
    expect(toItems(null)).toEqual([]);
    expect(toItems({ name: "Arroz" })).toEqual([]);
  });
});
