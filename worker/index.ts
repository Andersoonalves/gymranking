/**
 * Worker do FitRank. Serve só `/api/*` — o resto é asset estático do build.
 *
 * Hoje tem uma rota: upload do avatar para o R2. O bucket é público (leitura
 * direta pelo CDN, sem passar por aqui), então este endpoint é o único ponto
 * que escreve — e ele só deixa cada usuário escrever na própria pasta.
 */

const MAX_AVATAR_BYTES = 1024 * 1024; // 1 MB

// Tipagem mínima do binding: evita depender de @cloudflare/workers-types.
type R2PutOptions = { httpMetadata?: { contentType?: string; cacheControl?: string } };
type R2Like = { put(key: string, value: ArrayBuffer, options?: R2PutOptions): Promise<unknown> };

type Env = {
  MEDIA: R2Like;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MEDIA_BASE_URL: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Troca o access token do Supabase pelo id do usuário. Null se inválido. */
async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;

  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}

async function putAvatar(request: Request, env: Env): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Não autenticado" }, 401);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return json({ error: "Arquivo inválido" }, 415);

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: "Arquivo vazio" }, 400);
  // Content-Length é palpite do cliente; o que vale é o tamanho real recebido.
  if (body.byteLength > MAX_AVATAR_BYTES) return json({ error: "Imagem muito grande" }, 413);

  const key = `avatars/${userId}/avatar.jpg`;
  await env.MEDIA.put(key, body, {
    httpMetadata: {
      contentType: "image/jpeg",
      // A URL gravada no perfil carrega ?v=<timestamp>, então o objeto pode
      // ficar em cache eterno: trocar a foto muda a URL.
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return json({ url: `${env.MEDIA_BASE_URL}/${key}?v=${Date.now()}` });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/avatar") {
      if (request.method !== "PUT") return json({ error: "Método não permitido" }, 405);
      return putAvatar(request, env);
    }

    return json({ error: "Rota não encontrada" }, 404);
  },
};
