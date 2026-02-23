import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  exportApplicationServerKey,
  ApplicationServer,
  type PushSubscription,
} from "https://jsr.io/@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      const vapidKeysJwk = Deno.env.get("VAPID_KEYS_JWK");
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
      return new Response(JSON.stringify({ error: String(e) }), {
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

    const vapidKeysJwk = Deno.env.get("VAPID_KEYS_JWK");
    if (!vapidKeysJwk) {
      console.error("VAPID_KEYS_JWK not set");
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

    const title = `Novo treino em ${group_name}`;
    const body = `${display_name} registrou: ${workout_type}`;
    const payload = JSON.stringify({ title, body, url: "/" });

    let sent = 0;
    for (const row of subs) {
      try {
        const sub: PushSubscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        const subscriber = as.subscribe(sub);
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
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
