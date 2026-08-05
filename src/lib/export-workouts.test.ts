import { describe, it, expect } from "vitest";
import { bodyProgressToCSV } from "./export-workouts";

describe("bodyProgressToCSV", () => {
  it("gera cabeçalho e linhas com vírgula decimal", () => {
    const csv = bodyProgressToCSV([
      { recorded_at: "2026-07-01T12:00:00", weight_kg: 82.5, notes: null },
      { recorded_at: "2026-07-08T12:00:00", weight_kg: 82, notes: 'treino "pesado"' },
    ]);
    expect(csv.split("\n")).toEqual([
      "data;peso_kg;nota",
      '2026-07-01;82,5;""',
      '2026-07-08;82;"treino ""pesado"""',
    ]);
  });
});
