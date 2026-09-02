# Operação em produção — backend na VPS

> **Status: stack no ar com os dados migrados, não cortada.** A API responde
> em https://api-fitrank.oxehub.com.br com os 5 usuários, 138 treinos, os 27
> arquivos do storage e os jobs do pg_cron. O app em produção **continua
> apontando para o Supabase Cloud**, que não foi tocado. Falta a validação de
> ponta a ponta e o [cutover](#cutover).

## Desenho

O front **não** muda de casa: continua no Cloudflare Workers, com o R2 dos
avatares. Só o backend Supabase passa a rodar no VPS compartilhado com o
poupeFarma e o karhub.

```
Cloudflare
  fitrank.oxehub.com.br      → Workers static assets (dist) + worker/index.ts
  cdn-fitrank.oxehub.com.br  → R2 `fitrank` (avatares)
  api-fitrank.oxehub.com.br  → VPS 64.181.177.88
                                 │
VPS ~/fitrank                    ▼
  proxy central (~/proxy, rede `web`, TLS)
       │
  fitrank-caddy  /auth/v1/*      → auth:9999
                 /rest/v1/*      → rest:3000
                 /storage/v1/*   → storage:5000   (+ X-Forwarded-Prefix)
                 /functions/v1/* → functions:9000
       │
  db (supabase/postgres 17) ── volumes: pgdata, db-config, storage, deno-cache
```

Serviços do compose oficial que ficaram de fora — e por quê — estão comentados
no topo de `selfhost/docker-compose.prod.yml`. O mais relevante: **não há
gateway** (Envoy/Kong). Ele só fazia roteamento de path e checagem da `apikey`,
e a apikey não é segredo — ela vive no bundle do front. Quem chega sem ela cai
na role `anon`, que é exatamente o acesso que a anon key concede. **Quem
protege é a RLS**, então toda tabela nova continua precisando de policy.

O que o gateway fazia e **não** era dispensável é o **CORS**: ele aplicava um
filtro no virtual host inteiro. Medindo serviço a serviço, o PostgREST e as
Edge Functions respondem por conta, mas o GoTrue devolve 204 sem
`Access-Control-Allow-Origin` e o storage devolve 404 no preflight — o login
quebraria no navegador. Por isso o `Caddyfile` assume o CORS de todas as rotas,
com os mesmos valores do Envoy.

## Subida (primeira vez) — FEITA em 01/set/2026

Ordem importa: DNS cinza → stack no ar → bloco no proxy → laranja. Ligar o
proxy antes do certificado existir põe o Cloudflare em loop de redirect.

1. ✅ **DNS** — `api-fitrank` A → `64.181.177.88`. Um nível só de subdomínio: o
   certificado universal não cobre sub-subdomínio (mesma pegadinha já anotada
   no `wrangler.jsonc`).

2. ✅ **Clone** — `~/fitrank` no VPS, deploy key própria `~/.ssh/fitrank_deploy`
   (alias ssh `github-fitrank`), o padrão das outras duas apps: chave dedicada
   por repo, não a chave pessoal.

3. ✅ **Segredos**:
   ```bash
   node selfhost/gerar-chaves.mjs            # JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY
   cp selfhost/.env.prod.example selfhost/.env
   chmod 600 selfhost/.env                   # preencher o resto
   ```
   `VAPID_KEYS_JWK` é opcional: as funções caem para `public.app_secrets`, que
   vem no dump. Se preencher, **tem que ser o mesmo valor do Cloud** — a chave
   pública está gravada em cada subscription já registrada no navegador do
   usuário, e par novo cala o push de quem já ativou notificação.

4. ✅ **Subir**:
   ```bash
   sudo docker compose -f selfhost/docker-compose.prod.yml up -d
   ```

5. ✅ **Proxy central** — bloco em `~/proxy/Caddyfile` apontando
   `api-fitrank.oxehub.com.br` para `fitrank-caddy` (container `proxy-caddy`,
   backup do arquivo em `~/proxy/Caddyfile.bak`). **Validar antes de recarregar**:
   config quebrada ali derruba poupeFarma e karhub junto.
   ```bash
   sudo docker exec proxy-caddy caddy validate --config /etc/caddy/Caddyfile
   sudo docker exec proxy-caddy caddy reload   --config /etc/caddy/Caddyfile
   ```

6. ✅ **Cloudflare laranja**, com a zona em Full (strict). Verificado depois:
   HTTP/2 nas três rotas e preflight CORS com header único.

## Migração dos dados — FEITA em 01/set/2026

O Cloud continua de pé o tempo todo — nada aqui apaga o banco de produção.

Restaurado: 5 `auth.users` (com identities), 5 profiles, 138 workouts, 2 groups
com 5 members, 8 training_programs, `app_secrets` com o `cron_secret` e o
`vapid_keys_jwk`, 3 buckets e 27 objetos com os arquivos conferidos byte a
byte.

### Quatro armadilhas neste caminho

Nenhuma dá erro visível — todas passam como sucesso e quebram depois:

**1. Colunas de versionamento no storage.** O Cloud roda um storage-api de
branch (`fix-optimized-search-function`) com `buckets.versioning_status` e
`objects.archived_at`/`is_delete_marker`/`is_versioned`, que a `v1.60.4` não
tem. O `COPY` falha, o psql sai do modo de dados e passa a ler as linhas
seguintes como SQL — `storage.buckets` e `storage.objects` ficam **em zero**
enquanto o restore parece ter dado certo. A saída é restaurar essas duas
tabelas à parte, só com a interseção de colunas (`backups/cloud-storage.sql`,
gerado do dump).

**2. Extended attributes.** Copiar os binários direto no volume não funciona:
o backend `file` guarda content-type e cache-control em xattr do arquivo, e o
download depois devolve **HTTP 500 `ENODATA`** ("The extended attribute does
not exist"). Os arquivos têm que subir **pela API**, que grava binário e xattr
de uma vez. De quebra, o `tar` do macOS leva junto arquivos `._*` (AppleDouble)
— use `COPYFILE_DISABLE=1`.

**3. `wget` do BusyBox não tem `--post-file`.** Fazer o upload de dentro do
container `caddy` (Alpine) sobe arquivos de **4 a 8 bytes** e devolve **200 em
todos**. Subir com `curl`, de fora.

**4. Arquivo legado maior que o limite do bucket.** Uma foto de progresso de
1,2 MB é anterior ao limite de 1 MB do bucket e seria descartada em silêncio.
Elevar o `file_size_limit` só para a carga e **devolver o valor depois**.

**5. As policies de `storage.objects` não vêm no dump.** O `supabase db dump`
pula o schema `storage` por ser gerenciado, e o banco novo fica com **zero
policies** ali. É a pior das seis, porque some do radar: com `service_role`
tudo funciona (ele ignora RLS), então qualquer teste feito com a service key
passa — mas usuário normal leva **404 em toda foto**. As 11 policies vivem nas
migrations do projeto; `backups/storage-policies.sql` as extrai.

**6. O PostgREST cacheia o schema no boot.** As tabelas nascem no restore,
depois dele, então toda rota responde `PGRST205 — Could not find the table in
the schema cache`. Resolve sem reiniciar:

```sql
NOTIFY pgrst, 'reload schema';
```

### 1. Dump do Cloud

### 1. Dump do Cloud

Connection string em Supabase > Project Settings > Database (a de *session
mode*, porta 5432, não a do pooler).

```bash
export CLOUD="postgresql://postgres:SENHA@db.swopnxzsmymolasnqloh.supabase.co:5432/postgres"
npx supabase db dump --db-url "$CLOUD" -f roles.sql  --role-only
npx supabase db dump --db-url "$CLOUD" -f schema.sql
npx supabase db dump --db-url "$CLOUD" -f data.sql   --data-only --use-copy
```

Os três arquivos têm dado de usuário: ficam em `backups/`, que já está no
`.gitignore`.

### 2. Restore no VPS

```bash
# do lado de fora do container, com os três arquivos em /tmp
for f in roles schema data; do
  sudo docker cp /tmp/$f.sql fitrank-db:/tmp/
done
sudo docker exec -i fitrank-db psql -U postgres -d postgres \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file /tmp/roles.sql --file /tmp/schema.sql --file /tmp/data.sql
```

`session_replication_role = replica` desliga os triggers durante a carga — sem
isso os triggers do app disparam em cima de dado que está só sendo restaurado.

Erros de objeto que já existe (`extension "pg_net" already exists`, roles do
próprio Supabase) são esperados: a imagem já traz essa parte.

### 3. Arquivos do storage

O dump traz a tabela `storage.objects`, **não** os arquivos. Sem este passo o
app lista as fotos e todas dão 404:

```bash
npx supabase storage cp -r ss:///workout-photos  ./backups/storage/workout-photos  --experimental
npx supabase storage cp -r ss:///progress-photos ./backups/storage/progress-photos --experimental
# subir para o volume `storage` do compose (backend `file`, um diretório por bucket)
```

Avatar **não** entra aqui: continua no R2, servido pelo `cdn-fitrank`.

### 4. Jobs do pg_cron — FEITO

`daily-nudge` e `weekly-summary` são disparadas pelo `pg_cron` via `pg_net`,
com o segredo em `x-cron-secret`. Esses jobs **não vêm no dump** — o schema
`cron` fica de fora. Os três foram recriados com os mesmos horários:

| job | schedule | função |
|---|---|---|
| `weekly-summary` | `0 3 * * 1` | segunda 03:00 UTC = meia-noite em SP |
| `streak-reminder` | `0 23 * * *` | 23:00 UTC = 20h BRT |
| `challenge-results` | `0 12 * * *` | 12:00 UTC = 9h BRT |

Duas mudanças de propósito em relação ao Cloud:

- **URL interna** `http://caddy/functions/v1/...`. O `pg_net` roda dentro da
  rede do compose; não precisa sair para a internet, subir TLS e voltar pelo
  Cloudflare para falar com o container ao lado.
- **Segredo de `public.app_secrets`, não do Vault.** É a mesma fonte que a
  função usa para comparar o header. No Cloud o valor vivia duplicado (Vault
  *e* `app_secrets`) sem nada garantir que fossem iguais.

Verificado com um `net.http_post` de secret propositalmente errado: volta
`401 {"error":"Unauthorized"}`, o que prova a cadeia inteira (pg_cron → pg_net
→ Caddy → edge-runtime → função → `app_secrets`) sem disparar push real.

## Cutover

Só depois da validação abaixo passar inteira. É um commit de duas linhas:

```
wrangler.jsonc  vars.SUPABASE_URL       → https://api-fitrank.oxehub.com.br
                vars.SUPABASE_ANON_KEY  → a ANON_KEY gerada
.env            VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (mesmos valores)
```

O `worker/index.ts` valida o token batendo em `${SUPABASE_URL}/auth/v1/user`,
então ele passa a validar contra o GoTrue do VPS sem mudança de código.

**Rollback**: reverter esse commit e redeployar o Worker. O Cloud continua no
ar e não foi tocado — por isso ele não se apaga até a poeira baixar.

## Validação — 16/16 em 01/set/2026

`selfhost/validar.mjs` exercita a API com os **usuários reais migrados**. Ele
emite o token a partir do `JWT_SECRET` (mesmo formato do GoTrue), o que permite
testar a RLS com dados de produção sem a senha de ninguém:

```bash
JWT_SECRET=... ANON_KEY=... node selfhost/validar.mjs
```

Cobre: treinos do próprio usuário e dos colegas de grupo, anônimo barrado,
grupos, perfis, as RPCs `group_workouts` e `find_group_by_invite_code`,
progresso, dieta, inscrições de push, foto de progresso que **abre para o dono
e é negada para outro usuário**, foto de treino que abre para colega de grupo,
e `admin-users` negando usuário comum e aceitando admin.

Rodar depois de qualquer restore: é ele que pega as armadilhas 5 e 6, que não
dão erro em teste feito com a service key.

### Ainda não verificado

- **Envio real de push.** Testar dispara notificação para os 5 usuários de
  verdade; só com o dono ciente. A cadeia até a função está provada (401 com
  secret errado), falta o envio em si.
- **A UI no navegador.** Apontar um build local para a API nova (`.env.local` com
`VITE_SUPABASE_URL=https://api-fitrank.oxehub.com.br`) e percorrer:

- [ ] Login e cadastro (GoTrue + SMTP, ou `ENABLE_EMAIL_AUTOCONFIRM=true` se o SMTP ainda não estiver configurado)
- [ ] Listar treinos, grupos e ranking (PostgREST + RLS)
- [ ] As 3 RPCs: `find_group_by_invite_code`, `join_group_by_invite_code`, `group_workouts`
- [ ] Foto de treino e de progresso: upload, `createSignedUrl` e remoção
- [ ] **CORS** — resolvido no Caddy e verificado em stack local nas quatro rotas: preflight 204 com `Allow-Origin`/`Allow-Headers`, e resposta real com o header aparecendo **uma vez só** (duplicado o navegador recusa). Reconferir no ambiente real
- [ ] Push: ativar notificação e disparar `notify-new-workout`
- [ ] `/admin` com usuário admin, e 403 com usuário comum (`admin-users` confere o papel antes de usar a service role)

## Deploy contínuo

Push na `main` que toque `selfhost/**` ou `supabase/functions/**` dispara
`deploy.yml`: SSH no VPS, `git pull` e `compose up -d`. Não passa por tag —
diferente do poupeFarma e do karhub, aqui não há versão a subir.

Chave dedicada no secret `DEPLOY_SSH_KEY`, pública no `authorized_keys` do VPS
com `command=` forçado. **Mudou o `script:` do workflow, muda a linha do
`authorized_keys` junto.**

Deploy manual: `gh workflow run Deploy`. Fallback com o Actions fora do ar:

```bash
ssh -i ~/.ssh/ssh-key-2026-08-04.key ubuntu@64.181.177.88 \
  'cd ~/fitrank && git pull && sudo docker compose -f selfhost/docker-compose.prod.yml up -d'
```

Função nova em `supabase/functions/` **não** pede mudança no compose: a pasta
inteira é montada no edge-runtime. Mas o edge-runtime só relê no restart —
`compose up -d` recria o container, então o deploy já cobre.

## Backup

**Pendente.** Entrar no cron que já roda no VPS (`~/backup-poupefarma.sh`,
03:00 BRT, R2 `poupefarma-backups`), com duas pastas novas:

- `fitrank-pg/` — `pg_dump -Fc` do container `fitrank-db`
- `fitrank-storage/` — tar do volume `storage` (as fotos; o dump não as cobre)

Mesma retenção de 30 dias dos outros. Backup nunca restaurado não é backup:
testar num banco descartável, como foi feito para os outros dois apps.

## Pegadinhas

- **`JWT_SECRET` é a raiz de tudo.** Trocar invalida `ANON_KEY`,
  `SERVICE_ROLE_KEY` e toda sessão aberta. Se trocar, tem que regerar as duas
  chaves *e* redeployar o front com a anon key nova.
- **`SUPABASE_PUBLIC_URL` entra no `iss` dos tokens** e na base das URLs
  assinadas do storage. Mudar depois invalida token já emitido.
- **`X-Forwarded-Prefix` no Caddy** acompanha o
  `REQUEST_ALLOW_X_FORWARDED_PATH` do storage-api, como no gateway oficial. O
  `/object/sign` devolve URL relativa com ou sem ele — e é o certo, porque o
  supabase-js concatena `${supabaseUrl}/storage/v1` na frente. Tirar o header
  não quebra a foto, mas afasta do desenho oficial sem motivo.
- **Migrations não rodam sozinhas.** Diferente do karhub (Prisma no boot), aqui
  o schema veio do dump. Migration nova em `supabase/migrations/` precisa ser
  aplicada no VPS na mão, ou pelo `supabase db push` apontando para lá.
- **Sem `imgproxy`**: `ENABLE_IMAGE_TRANSFORMATION=false`. Se algum dia o app
  usar transformação de imagem no `createSignedUrl`, o serviço tem que voltar.
