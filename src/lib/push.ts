const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export async function getVapidPublicKey(supabaseUrl: string, anonKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/notify-new-workout`, {
    headers: { apikey: anonKey },
  });
  if (!res.ok) throw new Error("Falha ao obter chave de notificação");
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error("Chave de notificação não configurada");
  return publicKey;
}

export async function subscribePush(applicationServerKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
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
