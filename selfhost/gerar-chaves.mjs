#!/usr/bin/env node
/**
 * Gera JWT_SECRET, ANON_KEY e SERVICE_ROLE_KEY para o Supabase self-hosted.
 *
 * As duas chaves são JWTs HS256 assinados com o JWT_SECRET, com `role` no
 * payload — é assim que o PostgREST decide em qual role do Postgres a query
 * roda, e é o formato que o GoTrue, o storage-api e o edge-runtime esperam.
 * Trocar o JWT_SECRET invalida as duas e derruba toda sessão aberta.
 *
 *   node selfhost/gerar-chaves.mjs           # tudo novo
 *   node selfhost/gerar-chaves.mjs <secret>  # só as chaves, de um secret existente
 *   node selfhost/gerar-chaves.mjs --check   # self-check
 */
import { strict as assert } from 'node:assert';
import { createHmac, randomBytes } from 'node:crypto';

const ANOS = 10;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function assinar(payload, secret) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const assinatura = b64url(createHmac('sha256', secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${assinatura}`;
}

function chave(role, secret, agora = Math.floor(Date.now() / 1000)) {
  return assinar({ role, iss: 'supabase', iat: agora, exp: agora + ANOS * 365 * 24 * 3600 }, secret);
}

function check() {
  const secret = 'segredo-de-teste';
  const token = chave('anon', secret, 1000);
  const [head, body, assinatura] = token.split('.');

  assert.deepEqual(JSON.parse(Buffer.from(head, 'base64url')), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url')), {
    role: 'anon',
    iss: 'supabase',
    iat: 1000,
    exp: 1000 + ANOS * 365 * 24 * 3600,
  });
  // A assinatura tem que fechar com o mesmo secret e quebrar com outro.
  assert.equal(assinatura, b64url(createHmac('sha256', secret).update(`${head}.${body}`).digest()));
  assert.notEqual(assinatura, b64url(createHmac('sha256', 'outro').update(`${head}.${body}`).digest()));
  // base64url não pode carregar caractere que precise de escape em URL.
  assert.ok(!/[+/=]/.test(token), 'token saiu em base64 comum, não base64url');
  console.log('ok');
}

if (process.argv.includes('--check')) {
  check();
} else {
  const secret = process.argv[2] ?? randomBytes(32).toString('hex');
  console.log(`JWT_SECRET=${secret}`);
  console.log(`ANON_KEY=${chave('anon', secret)}`);
  console.log(`SERVICE_ROLE_KEY=${chave('service_role', secret)}`);
}
