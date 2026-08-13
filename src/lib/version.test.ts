import { describe, it, expect } from "vitest";
import { formatVersionTitle } from "./version";

describe("formatVersionTitle", () => {
  it("junta versão, commit e data do build", () => {
    const t = formatVersionTitle("1.0.121", "39db293", "2026-08-12T14:30:00Z");
    expect(t).toContain("Versão 1.0.121");
    expect(t).toContain("commit 39db293");
    expect(t).toContain("12/08/2026");
  });

  it("build sem git mostra só o que tem", () => {
    expect(formatVersionTitle("1.0.0", "", "")).toBe("Versão 1.0.0");
  });

  it("ignora data inválida em vez de escrever 'Invalid Date'", () => {
    expect(formatVersionTitle("1.0.0", "abc", "não é data")).toBe("Versão 1.0.0 · commit abc");
  });
});
