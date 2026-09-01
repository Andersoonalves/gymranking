# Operação em produção — backend na VPS

> **Status: preparado, não cortado.** Os arquivos de `selfhost/` sobem uma
> stack Supabase própria no VPS, mas o app em produção continua apontando para
> o Supabase Cloud. A virada é um commit separado (ver [Cutover](#cutover)).

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

## Subida (primeira vez)

Ordem importa: DNS cinza → stack no ar → bloco no proxy → laranja. Ligar o
proxy antes do certificado existir põe o Cloudflare em loop de redirect.

1. **DNS** — no Cloudflare, `api-fitrank` A → `64.181.177.88`, **nuvem cinza**.
   Um nível só de subdomínio: o certificado universal não cobre
   sub-subdomínio (mesma pegadinha já anotada no `wrangler.jsonc`).

2. **Clone** — no VPS, `~/fitrank`, com deploy key própria (o padrão das outras
   duas apps: chave dedicada por repo, não a chave pessoal).

3. **Segredos**:
   ```bash
   node selfhost/gerar-chaves.mjs            # JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY
   cp selfhost/.env.prod.example selfhost/.env
   chmod 600 selfhost/.env                   # preencher o resto
   ```
   `VAPID_KEYS_JWK` **tem que ser o mesmo do Cloud** — a chave pública está
   gravada em cada subscription já registrada no navegador do usuário. Par novo
   cala o push de quem já ativou notificação.

4. **Subir**:
   ```bash
   sudo docker compose -f selfhost/docker-compose.prod.yml up -d
   ```

5. **Proxy central** — bloco em `~/proxy/Caddyfile` apontando
   `api-fitrank.oxehub.com.br` para `fitrank-caddy`, recarregar, esperar o
   Let's Encrypt sair.

6. **Cloudflare laranja**, SSL/TLS já está em Full (strict) na zona toda.

## Migração dos dados

O Cloud continua de pé o tempo todo — nada aqui apaga o banco de produção.

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

### 4. Jobs do pg_cron

`daily-nudge` e `weekly-summary` são disparadas pelo `pg_cron` via `pg_net`,
com o segredo em `x-cron-secret`. Esses jobs **não vêm no dump** — o schema
`cron` fica de fora. Exportar do Cloud e recriar:

```sql
-- no Cloud
select jobname, schedule, command from cron.job;
```

Ao recriar no VPS, a URL dentro do `command` muda de `…supabase.co` para
`https://api-fitrank.oxehub.com.br`. Conferir também `public.app_secrets` e o
Vault, que guardam o `x-cron-secret`.

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

## Validação (antes do cutover)

Apontar um build local para a API nova (`.env.local` com
`VITE_SUPABASE_URL=https://api-fitrank.oxehub.com.br`) e percorrer:

- [ ] Login e cadastro (GoTrue + SMTP, ou `ENABLE_EMAIL_AUTOCONFIRM=true` se o SMTP ainda não estiver configurado)
- [ ] Listar treinos, grupos e ranking (PostgREST + RLS)
- [ ] As 3 RPCs: `find_group_by_invite_code`, `join_group_by_invite_code`, `group_workouts`
- [ ] Foto de treino e de progresso: upload, `createSignedUrl` e remoção
- [ ] **CORS** — front e API estão em domínios diferentes. Sem o gateway, quem responde ao preflight é cada serviço (PostgREST, GoTrue e storage-api fazem isso por conta). Se algum `OPTIONS` voltar sem `Access-Control-Allow-Origin`, o remendo é um `header` no `selfhost/Caddyfile` **só naquela rota** — duplicar o header em rota que já responde quebra o navegador
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
- **`X-Forwarded-Prefix` no Caddy** é par obrigatório do
  `REQUEST_ALLOW_X_FORWARDED_PATH` do storage-api. Sem ele a URL assinada volta
  sem o `/storage/v1` e não resolve de fora.
- **Migrations não rodam sozinhas.** Diferente do karhub (Prisma no boot), aqui
  o schema veio do dump. Migration nova em `supabase/migrations/` precisa ser
  aplicada no VPS na mão, ou pelo `supabase db push` apontando para lá.
- **Sem `imgproxy`**: `ENABLE_IMAGE_TRANSFORMATION=false`. Se algum dia o app
  usar transformação de imagem no `createSignedUrl`, o serviço tem que voltar.
