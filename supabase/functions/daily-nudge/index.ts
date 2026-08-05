import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  ApplicationServer,
  type PushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

/**
 * Cutucadas diárias por push, disparadas pelo pg_cron com x-cron-secret:
 * - kind=streak_reminder (23:00 UTC = 20h BRT): quem tem sequência em jogo e não treinou hoje.
 * - kind=challenge_results (12:00 UTC = 9h BRT): anuncia o campeão dos desafios que fecharam ontem.
 */

const SP_OFFSET_MS = 3 * 3600_000; // America/Sao_Paulo, sem DST desde 2019

function spDayKey(d: Date): string {
  const sp = new Date(d.getTime() - SP_OFFSET_MS);
  return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-${String(sp.getUTCDate()).padStart(2, "0")}`;
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: secretRow } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("name", "cron_secret")
    .single();
  if (!secretRow || req.headers.get("x-cron-secret") !== secretRow.value) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { kind } = await req.json().catch(() => ({ kind: null }));
  if (kind !== "streak_reminder" && kind !== "challenge_results") {
    return new Response(JSON.stringify({ error: "Unknown kind" }), { status: 400 });
  }

  let vapidKeysJwk = Deno.env.get("VAPID_KEYS_JWK") ?? null;
  if (!vapidKeysJwk) {
    const { data } = await supabase.from("app_secrets").select("value").eq("name", "vapid_keys_jwk").single();
    vapidKeysJwk = data?.value ?? null;
  }
  if (!vapidKeysJwk) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 503 });
  }
  const vapidKeys = await importVapidKeys(JSON.parse(vapidKeysJwk));
  const as = await ApplicationServer.new({
    contactInformation: "mailto:support@fitrank.app",
    vapidKeys,
  });

  const { data: allSubs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id");
  const subsByUser: Record<string, { endpoint: string; p256dh: string; auth: string }[]> = {};
  for (const s of allSubs ?? []) (subsByUser[s.user_id] ??= []).push(s);
  const subscribedIds = Object.keys(subsByUser);
  if (subscribedIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const send = async (userId: string, payload: string) => {
    let n = 0;
    for (const row of subsByUser[userId] ?? []) {
      try {
        const sub: PushSubscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
        await as.subscribe(sub).pushTextMessage(payload, { urgency: "normal" });
        n++;
      } catch (e) {
        console.error("Nudge push failed:", e);
      }
    }
    return n;
  };

  let sent = 0;

  if (kind === "streak_reminder") {
    const today = spDayKey(new Date());
    const cutoff = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const { data: recent } = await supabase
      .from("workouts")
      .select("user_id, workout_date")
      .in("user_id", subscribedIds)
      .gte("workout_date", cutoff);
    const daysByUser: Record<string, Set<string>> = {};
    for (const w of recent ?? []) {
      (daysByUser[w.user_id] ??= new Set()).add(spDayKey(new Date(w.workout_date)));
    }
    for (const userId of subscribedIds) {
      const days = daysByUser[userId];
      if (!days || days.has(today)) continue; // já treinou hoje (ou nunca treinou)
      // sequência terminando ontem
      let streak = 0;
      let cursor = addDaysKey(today, -1);
      while (days.has(cursor)) {
        streak++;
        cursor = addDaysKey(cursor, -1);
      }
      if (streak < 2) continue; // só cutuca quem tem o que perder
      sent += await send(
        userId,
        JSON.stringify({
          title: `🔥 ${streak} dias em jogo`,
          body: "Sua sequência quebra à meia-noite. Ainda dá tempo.",
          url: "/",
        }),
      );
    }
  }

  if (kind === "challenge_results") {
    const yesterday = addDaysKey(spDayKey(new Date()), -1);
    const { data: endedChallenges } = await supabase
      .from("challenges")
      .select("id, title, emoji, group_id, starts_at, ends_at, challenge_participants(user_id)")
      .eq("ends_at", yesterday);
    for (const c of endedChallenges ?? []) {
      const participantIds = (c.challenge_participants ?? []).map((p: { user_id: string }) => p.user_id);
      if (participantIds.length === 0) continue;
      // Treino não tem grupo: contam os treinos dos participantes no período.
      const { data: ws } = await supabase
        .from("workouts")
        .select("user_id, workout_date")
        .in("user_id", participantIds)
        .gte("workout_date", `${c.starts_at}T00:00:00-03:00`)
        .lte("workout_date", `${c.ends_at}T23:59:59-03:00`);
      const counts: Record<string, number> = {};
      for (const id of participantIds) counts[id] = 0;
      for (const w of ws ?? []) if (w.user_id in counts) counts[w.user_id]++;
      const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (ranked.length === 0 || ranked[0][1] === 0) continue;
      const [winnerId, winnerCount] = ranked[0];
      const { data: winnerProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", winnerId)
        .single();
      const winnerName = winnerProfile?.display_name ?? "Alguém";
      for (const userId of participantIds) {
        if (!subsByUser[userId]) continue;
        const mine = counts[userId] ?? 0;
        const position = ranked.findIndex(([uid]) => uid === userId) + 1;
        const payload = JSON.stringify(
          userId === winnerId
            ? {
                title: `🏆 Você venceu ${c.title}!`,
                body: `${winnerCount} treinos. Campeão do desafio ${c.emoji}`,
                url: "/rankings",
              }
            : {
                title: `${c.emoji} ${c.title} acabou`,
                body: `${winnerName} venceu com ${winnerCount}. Você: ${position}º com ${mine}.`,
                url: "/rankings",
              },
        );
        sent += await send(userId, payload);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
