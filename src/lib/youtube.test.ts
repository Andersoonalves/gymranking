import { describe, it, expect } from "vitest";
import { extractYouTubeId, youTubeThumbnail, youTubeEmbedUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("reconhece os formatos comuns de link", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=rT7DgCr-3pg")).toBe("rT7DgCr-3pg");
    expect(extractYouTubeId("https://youtu.be/rT7DgCr-3pg")).toBe("rT7DgCr-3pg");
    expect(extractYouTubeId("https://www.youtube.com/shorts/rT7DgCr-3pg")).toBe("rT7DgCr-3pg");
    expect(extractYouTubeId("https://www.youtube.com/embed/rT7DgCr-3pg")).toBe("rT7DgCr-3pg");
  });

  it("aceita parâmetros extras na URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?list=x&v=rT7DgCr-3pg&t=10")).toBe("rT7DgCr-3pg");
  });

  it("rejeita o que não é YouTube", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("https://vimeo.com/123")).toBeNull();
    expect(extractYouTubeId("texto qualquer")).toBeNull();
  });
});

describe("urls derivadas", () => {
  it("monta thumbnail e embed a partir do id", () => {
    expect(youTubeThumbnail("abc12345678")).toContain("abc12345678");
    expect(youTubeEmbedUrl("abc12345678")).toContain("embed/abc12345678");
  });
});
