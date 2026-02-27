# Deploy das Edge Functions (ex.: com Lovable)

O Lovable publica o **frontend**; as **Edge Functions** do Supabase não são deployadas automaticamente. Elas só passam a aparecer na lista do Dashboard depois que você faz o deploy pelo Supabase CLI.

## Pré-requisitos

- Supabase CLI (pode usar com `npx`):
  ```bash
  npx supabase --version
  ```
- Projeto já criado no Supabase (o mesmo que o Lovable usa).

## Passo a passo

### 1. Login no Supabase (se ainda não fez)

```bash
npx supabase login
```

Isso abre o navegador para você autorizar o CLI.

### 2. Vincular ao projeto na nuvem

Na **raiz do repositório** (onde está a pasta `supabase/`):

```bash
npx supabase link --project-ref vzdyugtqywcinpafbtqw
```

Quando pedir a **database password**, use a senha do banco do seu projeto (a que você definiu ao criar o projeto no Supabase, ou redefina em **Project Settings → Database**).

- O `project-ref` é o ID do projeto: no Dashboard do Supabase, está na URL (`https://supabase.com/dashboard/project/vzdyugtqywcinpafbtqw`) ou em **Project Settings → General**.

### 3. Fazer deploy da função de notificações

```bash
npx supabase functions deploy notify-new-workout
```

Quando terminar, a função **notify-new-workout** passa a aparecer em **Edge Functions** no Dashboard e a URL fica:

`https://vzdyugtqywcinpafbtqw.supabase.co/functions/v1/notify-new-workout`

### 4. Secrets (VAPID, etc.)

Se você já configurou **VAPID_KEYS_JWK** em **Project Settings → Edge Functions → Secrets**, a função já vai usar. Para definir ou alterar via CLI:

```bash
npx supabase secrets set VAPID_KEYS_JWK='{"kty":"EC",...}'
```

(Use o JSON gerado por `deno run scripts/generate-vapid-jwk.ts`.)

---

## Resumo rápido

```bash
npx supabase login
npx supabase link --project-ref vzdyugtqywcinpafbtqw
npx supabase functions deploy notify-new-workout
```

Depois disso, a função aparece na lista de Edge Functions no Supabase.
