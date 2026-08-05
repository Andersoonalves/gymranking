import { describe, expect, it } from "vitest";
import { groupPhotosByDay } from "./workout-photos";

const urls = { "u/1.jpg": "url1", "u/2.jpg": "url2", "u/3.jpg": "url3", "u/4.jpg": "url4" };

const workout = (id: string, date: string, photo: string | null) => ({
  id,
  workout_date: date,
  workout_type: `Treino ${id}`,
  photo_url: photo,
});

describe("groupPhotosByDay", () => {
  it("agrupa por dia e mantém a mais recente no topo", () => {
    const r = groupPhotosByDay(
      [
        workout("a", "2026-08-04T08:00:00Z", "u/1.jpg"),
        workout("b", "2026-08-04T20:00:00Z", "u/2.jpg"),
      ],
      urls,
    );
    expect(r["2026-08-04"].map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("independe da ordem de entrada", () => {
    const asc = groupPhotosByDay(
      [workout("a", "2026-08-04T08:00:00Z", "u/1.jpg"), workout("b", "2026-08-04T20:00:00Z", "u/2.jpg")],
      urls,
    );
    const desc = groupPhotosByDay(
      [workout("b", "2026-08-04T20:00:00Z", "u/2.jpg"), workout("a", "2026-08-04T08:00:00Z", "u/1.jpg")],
      urls,
    );
    expect(asc).toEqual(desc);
  });

  it("corta no máximo por dia, descartando as mais antigas", () => {
    const r = groupPhotosByDay(
      [
        workout("a", "2026-08-04T06:00:00Z", "u/1.jpg"),
        workout("b", "2026-08-04T10:00:00Z", "u/2.jpg"),
        workout("c", "2026-08-04T14:00:00Z", "u/3.jpg"),
        workout("d", "2026-08-04T18:00:00Z", "u/4.jpg"),
      ],
      urls,
    );
    expect(r["2026-08-04"].map((p) => p.id)).toEqual(["d", "c", "b"]);
  });

  it("separa dias diferentes", () => {
    const r = groupPhotosByDay(
      [workout("a", "2026-08-04T10:00:00Z", "u/1.jpg"), workout("b", "2026-08-05T10:00:00Z", "u/2.jpg")],
      urls,
    );
    expect(Object.keys(r).sort()).toEqual(["2026-08-04", "2026-08-05"]);
    expect(r["2026-08-05"].map((p) => p.id)).toEqual(["b"]);
  });

  it("ignora treino sem foto e foto sem URL assinada", () => {
    const r = groupPhotosByDay(
      [
        workout("sem-foto", "2026-08-04T10:00:00Z", null),
        workout("sem-url", "2026-08-04T11:00:00Z", "u/desconhecida.jpg"),
        workout("ok", "2026-08-04T12:00:00Z", "u/1.jpg"),
      ],
      urls,
    );
    expect(r["2026-08-04"].map((p) => p.id)).toEqual(["ok"]);
  });

  it("sem foto nenhuma, mapa vazio", () => {
    expect(groupPhotosByDay([workout("a", "2026-08-04T10:00:00Z", null)], urls)).toEqual({});
  });
});
