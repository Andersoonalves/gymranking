import { describe, it, expect } from "vitest";
import { errorMessage } from "./utils";

describe("errorMessage", () => {
  it("usa a mensagem de um Error", () => {
    expect(errorMessage(new Error("estourou"))).toBe("estourou");
  });

  it("usa a mensagem do PostgrestError, que não é instância de Error", () => {
    const postgrestError = { message: "Este grupo já está cheio: são 20 membros no máximo.", code: "23514" };
    expect(errorMessage(postgrestError, "fallback")).toBe("Este grupo já está cheio: são 20 membros no máximo.");
  });

  it("cai no fallback quando não há mensagem aproveitável", () => {
    expect(errorMessage({ code: "23514" }, "Erro ao salvar")).toBe("Erro ao salvar");
    expect(errorMessage(new Error(""), "Erro ao salvar")).toBe("Erro ao salvar");
    expect(errorMessage(null, "Erro ao salvar")).toBe("Erro ao salvar");
  });
});
