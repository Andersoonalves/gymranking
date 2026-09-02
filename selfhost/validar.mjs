#!/usr/bin/env node
/**
 * Validação da API do FitRank self-hosted, exercitando o que as telas do app
 * fazem, com usuários REAIS migrados do Cloud.
 *
 * O token é emitido aqui a partir do JWT_SECRET (mesmo formato que o GoTrue
 * emite no login), o que permite testar a RLS com dados de produção sem
 * precisar da senha de ninguém.
 *
 *   JWT_SECRET=... ANON_KEY=... node validar-fitrank.mjs
 */
import { createHmac } from 'node:crypto';

const BASE = process.env.BASE ?? 'https://api-fitrank.oxehub.com.br';
const { JWT_SECRET, ANON_KEY } = process.env;
if (!JWT_SECRET || !ANON_KEY) throw new Error('faltam JWT_SECRET e ANON_KEY');

const ADMIN = '16414825-634d-434e-ad1c-dedacff4749c'; // Anderson, 124 treinos
const COMUM = '1b28e8db-ea44-4962-b369-e206c909409f'; // Fábio Luan, 10 treinos

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokenDe(sub) {
  const agora = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ sub, role: 'authenticated', aud: 'authenticated', iat: agora, exp: agora + 3600 });
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

const resultados = [];
function checar(nome, condicao, detalhe = '') {
  resultados.push({ nome, ok: !!condicao, detalhe });
  console.log(`${condicao ? 'ok  ' : 'FALHA'}  ${nome}${detalhe ? '  — ' + detalhe : ''}`);
}

async function api(caminho, { token, metodo = 'GET', corpo } = {}) {
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      apikey: ANON_KEY,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(corpo ? { 'content-type': 'application/json' } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const texto = await r.text();
  let dados; try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: r.status, dados };
}

const tAdmin = tokenDe(ADMIN);
const tComum = tokenDe(COMUM);

// ---- Dados das telas ----
let r = await api('/rest/v1/workouts?select=id,workout_type,workout_date&order=workout_date.desc', { token: tAdmin });
checar('Treinos: admin vê os próprios', r.status === 200 && r.dados.length > 0, `${r.dados.length} linhas`);

// A policy é "own and group mates": quem está no grupo vê os treinos de todos
// os colegas, não só os seus. É o que alimenta o ranking.
r = await api('/rest/v1/workouts?select=id,user_id', { token: tComum });
const donos = new Set((r.dados ?? []).map((w) => w.user_id));
checar('Treinos: colega de grupo vê os do grupo', r.status === 200 && donos.size > 1, `${r.dados?.length} linhas de ${donos.size} usuários`);

r = await api('/rest/v1/workouts?select=id');
checar('Treinos: anônimo é barrado pela RLS', r.status >= 400 || (Array.isArray(r.dados) && r.dados.length === 0), `status ${r.status}`);

r = await api('/rest/v1/groups?select=id,name,invite_code', { token: tAdmin });
checar('Grupos: lista os do usuário', r.status === 200 && r.dados.length > 0, `${r.dados.length} grupo(s)`);
const grupo = r.dados?.[0]?.id;

r = await api('/rest/v1/profiles?select=user_id,display_name', { token: tAdmin });
checar('Perfis: visíveis para membro do grupo', r.status === 200 && r.dados.length > 1, `${r.dados.length} perfis`);

// ---- RPCs ----
r = await api('/rest/v1/rpc/group_workouts', { token: tAdmin, metodo: 'POST', corpo: { _group_id: grupo } });
checar('RPC group_workouts (ranking)', r.status === 200 && Array.isArray(r.dados), `${r.dados?.length} linhas`);

r = await api('/rest/v1/rpc/find_group_by_invite_code', { token: tComum, metodo: 'POST', corpo: { _code: 'NAOEXISTE' } });
checar('RPC find_group_by_invite_code', r.status === 200 && Array.isArray(r.dados), `código inexistente devolve vazio`);

// ---- Progresso e dieta ----
r = await api('/rest/v1/body_progress?select=id,photo_url', { token: tAdmin });
checar('Progresso corporal', r.status === 200 && r.dados.length > 0, `${r.dados.length} registros`);
const fotoProgresso = r.dados?.find((x) => x.photo_url)?.photo_url;

r = await api('/rest/v1/diet_meals?select=id', { token: tAdmin });
checar('Dieta', r.status === 200, `${r.dados?.length ?? 0} refeições`);

r = await api('/rest/v1/push_subscriptions?select=id', { token: tAdmin });
checar('Inscrições de push', r.status === 200, `${r.dados?.length ?? 0} inscrição(ões)`);

// ---- Storage: a foto tem que abrir de verdade ----
// Nenhum body_progress tem photo_url (nem aqui nem no Cloud: 0 de 3), então a
// foto de progresso é testada direto pelo objeto, que é o que a policy
// "Users can view own progress photos" protege — pasta = uid do dono.
{
  const objProgresso = `${ADMIN}/1772253732794.jpeg`;
  let rp = await api(`/storage/v1/object/sign/progress-photos/${objProgresso}`, { token: tAdmin, metodo: 'POST', corpo: { expiresIn: 600 } });
  checar('Storage: dono assina a própria foto de progresso', !!rp.dados?.signedURL, rp.dados?.signedURL ? '' : JSON.stringify(rp.dados));
  if (rp.dados?.signedURL) {
    const img = await fetch(`${BASE}/storage/v1${rp.dados.signedURL}`);
    const buf = Buffer.from(await img.arrayBuffer());
    checar('Storage: baixa a foto de progresso', img.ok && buf.length > 1000, `${buf.length} bytes, ${img.headers.get('content-type')}`);
  }
  // A mesma foto, pedida por outro usuário, tem que ser negada.
  rp = await api(`/storage/v1/object/sign/progress-photos/${objProgresso}`, { token: tComum, metodo: 'POST', corpo: { expiresIn: 600 } });
  checar('Storage: outro usuário NÃO assina foto de progresso alheia', !rp.dados?.signedURL, JSON.stringify(rp.dados).slice(0, 50));
}

if (fotoProgresso) {
  r = await api(`/storage/v1/object/sign/progress-photos/${fotoProgresso}`, { token: tAdmin, metodo: 'POST', corpo: { expiresIn: 600 } });
  const url = r.dados?.signedURL;
  checar('Storage: assina foto de progresso', !!url, url ? '' : JSON.stringify(r.dados));
  if (url) {
    const img = await fetch(`${BASE}/storage/v1${url}`);
    const buf = Buffer.from(await img.arrayBuffer());
    checar('Storage: baixa a foto', img.ok && buf.length > 1000, `${buf.length} bytes, ${img.headers.get('content-type')}`);
  }
}

// A única policy de SELECT em workout-photos é "Group mates can view".
r = await api('/rest/v1/workouts?select=photo_url&photo_url=not.is.null&limit=1', { token: tComum });
const fotoTreino = r.dados?.[0]?.photo_url;
if (fotoTreino) {
  r = await api(`/storage/v1/object/sign/workout-photos/${fotoTreino}`, { token: tComum, metodo: 'POST', corpo: { expiresIn: 600 } });
  checar('Storage: colega de grupo assina foto de treino', !!r.dados?.signedURL, r.dados?.signedURL ? '' : JSON.stringify(r.dados));
}

// ---- Edge function e papel de admin ----
// A função lê a action da query string, com GET — não do corpo.
r = await api('/functions/v1/admin-users?action=list', { token: tComum });
checar('admin-users: nega usuário comum', r.status === 403 || r.dados?.error, JSON.stringify(r.dados).slice(0, 60));

r = await api('/functions/v1/admin-users?action=list', { token: tAdmin });
checar('admin-users: aceita admin', r.status === 200 && Array.isArray(r.dados?.users ?? r.dados), `status ${r.status}`);

// ---- Resumo ----
const falhas = resultados.filter((x) => !x.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} passaram`);
if (falhas.length) {
  console.log('falhas:', falhas.map((f) => f.nome).join('; '));
  process.exit(1);
}
