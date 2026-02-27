const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export async function getVapidPublicKey(supabaseUrl: string, anonKey: string): Promise<string> {
  const url = `${supabaseUrl}/functions/v1/notify-new-workout`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { apikey: anonKey } });
  } catch (e) {
    throw new Error(
      "Não foi possível conectar ao servidor de notificações. Verifique se a Edge Function notify-new-workout está deployada (veja docs/EDGE-FUNCTIONS-DEPLOY.md)."
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error ?? `Erro ${res.status}: ${res.statusText}`;
    if (res.status === 503 || msg.includes("Not configured")) {
      throw new Error(
        "Notificações não configuradas no servidor. Configure o secret VAPID_KEYS_JWK no Supabase (Project Settings → Edge Functions → Secrets) e faça o deploy da função notify-new-workout."
      );
    }
    if (res.status === 404) {
      throw new Error("Função de notificações não encontrada. Faça o deploy: npx supabase functions deploy notify-new-workout");
    }
    throw new Error(`Falha ao obter chave: ${msg}`);
  }
  const publicKey = body?.publicKey;
  if (!publicKey) throw new Error("Chave de notificação não configurada no servidor.");
  return publicKey;
}

export async function subscribePush(applicationServerKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = await (reg as any).pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
  });
  return sub;
}

export function subscriptionToPayload(sub: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth: string;
} {
  const key = sub.getKey("p256dh");
  const auth = sub.getKey("auth");
  if (!key || !auth) throw new Error("Subscription keys missing");
  const toBase64Url = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return {
    endpoint: sub.endpoint,
    p256dh: toBase64Url(key),
    auth: toBase64Url(auth),
  };
}

export async function notifyNewWorkout(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
  payload: {
    group_id: string;
    group_name: string;
    exclude_user_id: string;
    display_name: string;
    workout_type: string;
  }
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/functions/v1/notify-new-workout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? "Falha ao enviar notificações");
  }
}
