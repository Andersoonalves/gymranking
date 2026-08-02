import { describe, it, expect } from "vitest";
import { personalRecords, isPersonalRecord, prCount, type HistoryEntry } from "./personal-records";
import { computeAchievements, maxStreak } from "./achievements";

const h = (title: string, load: number, day: number): HistoryEntry => ({
  exercise_title: title,
  load_kg: load,
  reps: 10,
  recorded_at: new Date(2026, 7, day, 10).toISOString(),
});

describe("personalRecords", () => {
  it("guarda a maior carga por exercício", () => {
    const recs = personalRecords([h("Supino", 60, 1), h("Supino", 80, 5), h("Supino", 70, 8), h("Agachamento", 100, 2)]);
    expect(recs["Supino"].load_kg).toBe(80);
    expect(recs["Agachamento"].load_kg).toBe(100);
  });

  it("ignora cargas zeradas", () => {
    expect(personalRecords([h("Prancha", 0, 1)])).toEqual({});
  });
});

describe("isPersonalRecord", () => {
  const history = [h("Supino", 60, 1), h("Supino", 80, 5)];

  it("carga acima do máximo é PR", () => {
    expect(isPersonalRecord(history, "Supino", 82.5)).toBe(true);
  });

  it("carga igual ou menor não é PR", () => {
    expect(isPersonalRecord(history, "Supino", 80)).toBe(false);
    expect(isPersonalRecord(history, "Supino", 70)).toBe(false);
  });

  it("primeira carga de um exercício novo é PR", () => {
    expect(isPersonalRecord(history, "Remada", 40)).toBe(true);
  });

  it("carga zero nunca é PR", () => {
    expect(isPersonalRecord([], "Supino", 0)).toBe(false);
  });
});

describe("prCount", () => {
  it("conta exercícios distintos com recorde", () => {
    expect(prCount([h("A", 10, 1), h("A", 12, 2), h("B", 20, 1)])).toBe(2);
  });
});

describe("maxStreak", () => {
  const iso = (d: number) => new Date(2026, 7, d, 9).toISOString();

  it("acha a maior sequência histórica", () => {
    expect(maxStreak([iso(1), iso(2), iso(3), iso(10), iso(11)])).toBe(3);
  });

  it("dois treinos no mesmo dia contam um", () => {
    expect(maxStreak([iso(1), iso(1), iso(2)])).toBe(2);
  });

  it("vazio dá zero", () => {
    expect(maxStreak([])).toBe(0);
  });
});

describe("computeAchievements", () => {
  const workout = (day: number, hour = 10, photo = false) => ({
    workout_date: new Date(2026, 7, day, hour).toISOString(),
    photo_url: photo ? "x.png" : null,
  });

  it("destrava primeira vez e sequência de 7", () => {
    const ws = Array.from({ length: 7 }, (_, i) => workout(i + 1));
    const a = computeAchievements(ws, 0);
    expect(a.find((x) => x.id === "first")?.unlocked).toBe(true);
    expect(a.find((x) => x.id === "streak7")?.unlocked).toBe(true);
    expect(a.find((x) => x.id === "ten")?.unlocked).toBe(false);
    expect(a.find((x) => x.id === "ten")?.progress).toBeCloseTo(0.7);
  });

  it("PRs destravam conquistas de recorde", () => {
    const a = computeAchievements([workout(1)], 10);
    expect(a.find((x) => x.id === "pr1")?.unlocked).toBe(true);
    expect(a.find((x) => x.id === "pr10")?.unlocked).toBe(true);
  });

  it("madrugador exige 5 treinos antes das 7h", () => {
    const ws = Array.from({ length: 5 }, (_, i) => workout(i + 1, 6));
    expect(computeAchievements(ws, 0).find((x) => x.id === "early")?.unlocked).toBe(true);
  });
});
