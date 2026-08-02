import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  exportApplicationServerKey,
  ApplicationServer,
  type PushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** VAPID do env ou, em fallback, de app_secrets (via service role). */
async function getVapidJwk(): Promise<string | null> {
  const env = Deno.env.get("VAPID_KEYS_JWK");
  if (env) return env;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("app_secrets")
    .select("value")
    .eq("name", "vapid_keys_jwk")
    .single();
  return data?.value ?? null;
}

interface NotifyBody {
  group_id: string;
  exclude_user_id: string;
  display_name: string;
  workout_type: string;
  group_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    try {
      const vapidKeysJwk = await getVapidJwk();
      if (!vapidKeysJwk) {
        return new Response(JSON.stringify({ error: "Not configured" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const vapidKeys = await importVapidKeys(JSON.parse(vapidKeysJwk));
      const publicKey = await exportApplicationServerKey(vapidKeys);
      return new Response(JSON.stringify({ publicKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("VAPID public key error:", e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate the JWT
  const token = authHeader.replace("Bearer ", "");
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsError } =
    await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = claimsData.claims.sub as string;

  try {
    const body: NotifyBody = await req.json();
    const { group_id, exclude_user_id, display_name, workout_type, group_name } = body;
    if (!group_id || !exclude_user_id || !display_name || !workout_type || !group_name) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is a member of the group they want to notify
    const { data: callerMembership } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group_id)
      .eq("user_id", callerId)
      .maybeSingle();
    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group_id)
      .neq("user_id", exclude_user_id);
    const userIds = (members ?? []).map((m) => m.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidKeysJwk = await getVapidJwk();
    if (!vapidKeysJwk) {
      console.error("VAPID keys not configured");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidKeys = await importVapidKeys(JSON.parse(vapidKeysJwk));
    const as = await ApplicationServer.new({
      contactInformation: "mailto:support@fitrank.app",
      vapidKeys,
    });

    // Provocação de ultrapassagem: conta os treinos da semana (seg 00:00 em
    // São Paulo) por membro. Quem ficou exatamente 1 atrás do registrante
    // acabou de ser ultrapassado/desempatado e recebe a mensagem afiada.
    const overtaken = new Set<string>();
    let registrantCount = 0;
    try {
      const nowSp = new Date(Date.now() - 3 * 3600_000);
      const dow = (nowSp.getUTCDay() + 6) % 7; // 0 = segunda
      const weekStartUtc = new Date(
        Date.UTC(nowSp.getUTCFullYear(), nowSp.getUTCMonth(), nowSp.getUTCDate() - dow, 3, 0, 0),
      );
      const { data: weekWorkouts } = await supabase
        .from("workouts")
        .select("user_id")
        .eq("group_id", group_id)
        .gte("workout_date", weekStartUtc.toISOString());
      const counts: Record<string, number> = {};
      for (const w of weekWorkouts ?? []) counts[w.user_id] = (counts[w.user_id] ?? 0) + 1;
      registrantCount = counts[exclude_user_id] ?? 0;
      for (const uid of userIds) {
        if ((counts[uid] ?? 0) === registrantCount - 1) overtaken.add(uid);
      }
    } catch (e) {
      console.error("Overtake check failed:", e);
    }

    // Precisa do dono de cada subscription pra personalizar a mensagem
    const { data: subsWithUser } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", userIds);

    const defaultPayload = JSON.stringify({
      title: `Novo treino em ${group_name}`,
      body: `${display_name} registrou: ${workout_type}`,
      url: "/",
    });
    const overtakenPayload = JSON.stringify({
      title: `⚔️ ${display_name} te ultrapassou!`,
      body: `${registrantCount} treinos na semana em ${group_name}. Responde à altura.`,
      url: "/rankings",
    });

    let sent = 0;
    for (const row of subsWithUser ?? subs) {
      try {
        const sub: PushSubscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        const subscriber = as.subscribe(sub);
        const payload = "user_id" in row && overtaken.has(row.user_id as string) ? overtakenPayload : defaultPayload;
        await subscriber.pushTextMessage(payload, { urgency: "high" });
        sent++;
      } catch (e) {
        console.error("Push failed for subscription:", e);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-new-workout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
