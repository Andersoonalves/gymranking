#!/usr/bin/env -S deno run --allow-env
/**
 * Gera um par de chaves VAPID e imprime o JWK para configurar o secret
 * VAPID_KEYS_JWK no Supabase (Edge Functions → Secrets).
 *
 * Requer Deno: https://deno.land ou `curl -fsSL https://deno.land/install.sh | sh`
 *
 * Uso: deno run scripts/generate-vapid-jwk.ts
 *
 * Copie apenas o JSON (uma linha ou o bloco) e cole em:
 * Supabase Dashboard → Project Settings → Edge Functions → Secrets
 * Nome: VAPID_KEYS_JWK  Valor: <o JSON gerado>
 */
import {
  exportApplicationServerKey,
  exportVapidKeys,
  generateVapidKeys,
} from "https://jsr.io/@negrel/webpush@0.5.0";

const keys = await generateVapidKeys({ extractable: true });
const vapidJwks = await exportVapidKeys(keys);
const publicKey = await exportApplicationServerKey(keys);

const jwkString = JSON.stringify(vapidJwks);

console.log("--- Cole o bloco abaixo no secret VAPID_KEYS_JWK do Supabase ---\n");
console.log(jwkString);
console.log("\n--- Chave pública (para conferência no frontend) ---");
console.log(publicKey);
