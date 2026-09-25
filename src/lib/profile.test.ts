import { describe, expect, it } from "vitest";
import { isProfileComplete } from "./profile";

describe("isProfileComplete", () => {
  it("exige nome e foto", () => {
    expect(isProfileComplete({ display_name: "Ana", avatar_url: "https://x/a.jpg" })).toBe(true);
    expect(isProfileComplete({ display_name: "Ana", avatar_url: null })).toBe(false);
    expect(isProfileComplete({ display_name: "  ", avatar_url: "https://x/a.jpg" })).toBe(false);
  });

  it("recusa e-mail no lugar do nome", () => {
    expect(isProfileComplete({ display_name: "ana@gmail.com", avatar_url: "https://x/a.jpg" })).toBe(false);
  });

  it("sem perfil é incompleto", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});
