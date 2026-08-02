import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  ApplicationServer,
  type PushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

/**
 * Resumo semanal por push, disparado pelo pg_cron toda segunda 03:00 UTC
 * (meia-noite em São Paulo). Protegida pelo segredo em public.app_secrets (RLS sem policies) —
 * o cron manda o mesmo valor via header x-cron-secret (lido do Vault).
 */
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

  let vapidKeysJwk = Deno.env.get("VAPID_KEYS_JWK") ?? null;
  if (!vapidKeysJwk) {
    const { data } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("name", "vapid_keys_jwk")
      .single();
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

  // Semana fechada: segunda 00:00 → segunda 00:00, no fuso de São Paulo (UTC-3 fixo)
  const nowSp = new Date(Date.now() - 3 * 3600_000);
  const dow = (nowSp.getUTCDay() + 6) % 7;
  const thisMonday = Date.UTC(nowSp.getUTCFullYear(), nowSp.getUTCMonth(), nowSp.getUTCDate() - dow, 3, 0, 0);
  const weekStart = new Date(thisMonday - 7 * 86_400_000).toISOString();
  const weekEnd = new Date(thisMonday).toISOString();

  const { data: groups } = await supabase.from("groups").select("id, name");
  const { data: allSubs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .eq("weekly_summary", true);
  const subsByUser: Record<string, { endpoint: string; p256dh: string; auth: string }[]> = {};
  for (const s of allSubs ?? []) (subsByUser[s.user_id] ??= []).push(s);

  let sent = 0;
  for (const group of groups ?? []) {
    const { data: weekWorkouts } = await supabase
      .from("workouts")
      .select("user_id")
      .eq("group_id", group.id)
      .gte("workout_date", weekStart)
      .lt("workout_date", weekEnd);
    if (!weekWorkouts?.length) continue;

    const counts: Record<string, number> = {};
    for (const w of weekWorkouts) counts[w.user_id] = (counts[w.user_id] ?? 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [leaderId, leaderCount] = ranked[0];

    const { data: leaderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", leaderId)
      .single();
    const leaderName = leaderProfile?.display_name ?? "Alguém";

    const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", group.id);
    for (const member of members ?? []) {
      const subs = subsByUser[member.user_id];
      if (!subs?.length) continue;
      const mine = counts[member.user_id] ?? 0;
      const position = ranked.findIndex(([uid]) => uid === member.user_id) + 1;
      const payload = JSON.stringify(
        member.user_id === leaderId
          ? {
              title: `🏆 Você fechou a semana em 1º!`,
              body: `${leaderCount} treinos em ${group.name}. Semana nova, placar zerado — defende o título.`,
              url: "/rankings",
            }
          : {
              title: `🏁 Semana fechada em ${group.name}`,
              body:
                mine > 0
                  ? `${leaderName} levou com ${leaderCount}. Você: ${position}º com ${mine}. Semana nova começou.`
                  : `${leaderName} levou com ${leaderCount}. Você ficou de fora — semana nova, chance nova.`,
              url: "/rankings",
            },
      );
      for (const row of subs) {
        try {
          const sub: PushSubscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
          await as.subscribe(sub).pushTextMessage(payload, { urgency: "normal" });
          sent++;
        } catch (e) {
          console.error("Weekly push failed:", e);
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
