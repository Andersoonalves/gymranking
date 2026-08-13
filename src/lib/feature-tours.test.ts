import { describe, it, expect } from "vitest";
import {
  parseSeenTours,
  serializeSeenTours,
  pendingTour,
  latestTour,
  FEATURE_TOURS,
  type FeatureTour,
} from "./feature-tours";

const tour = (id: string, releasedAt: string): FeatureTour => ({
  id,
  releasedAt,
  title: id,
  subtitle: "",
  steps: [{ icon: "utensils", title: "t", body: "b" }],
});

const dieta = tour("dieta", "2026-08-12");
const antigo = tour("desafios", "2026-06-01");

describe("pendingTour", () => {
  it("mostra o tour para conta criada antes do lançamento", () => {
    expect(pendingTour([dieta], [], "2026-05-01T10:00:00Z")?.id).toBe("dieta");
  });

  it("não mostra para conta criada depois do lançamento", () => {
    expect(pendingTour([dieta], [], "2026-09-01T10:00:00Z")).toBeNull();
  });

  it("conta criada no mesmo dia do lançamento ainda vê", () => {
    expect(pendingTour([dieta], [], "2026-08-12T23:00:00Z")?.id).toBe("dieta");
  });

  it("não repete tour já visto", () => {
    expect(pendingTour([dieta], ["dieta"], "2026-01-01T00:00:00Z")).toBeNull();
  });

  it("com vários pendentes, começa pelo mais antigo", () => {
    expect(pendingTour([dieta, antigo], [], "2026-01-01T00:00:00Z")?.id).toBe("desafios");
  });

  it("sem data de conta, assume usuário existente", () => {
    expect(pendingTour([dieta], [], undefined)?.id).toBe("dieta");
  });
});

describe("latestTour", () => {
  it("pega o lançamento mais recente, visto ou não", () => {
    expect(latestTour([antigo, dieta])?.id).toBe("dieta");
  });

  it("sem tour nenhum, devolve null", () => {
    expect(latestTour([])).toBeNull();
  });
});

describe("parseSeenTours / serializeSeenTours", () => {
  it("ida e volta preserva os ids", () => {
    expect(parseSeenTours(serializeSeenTours(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("remove duplicados ao gravar", () => {
    expect(parseSeenTours(serializeSeenTours(["a", "a"]))).toEqual(["a"]);
  });

  it("aguenta valor ausente ou corrompido no localStorage", () => {
    expect(parseSeenTours(null)).toEqual([]);
    expect(parseSeenTours("não é json")).toEqual([]);
    expect(parseSeenTours('{"nao":"array"}')).toEqual([]);
    expect(parseSeenTours('["a", 42, null]')).toEqual(["a"]);
  });
});

describe("FEATURE_TOURS", () => {
  it("não tem id repetido", () => {
    const ids = FEATURE_TOURS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo tour tem pelo menos um passo e data no formato certo", () => {
    for (const t of FEATURE_TOURS) {
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
