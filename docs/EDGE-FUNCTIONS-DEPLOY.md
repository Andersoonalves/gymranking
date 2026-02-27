# Deploy das Edge Functions (ex.: com Lovable)

O Lovable publica o **frontend**; as **Edge Functions** do Supabase não são deployadas automaticamente. Elas só passam a aparecer na lista do Dashboard depois que você faz o deploy pelo Supabase CLI.

## ⚠️ Notificações: checklist para funcionar

Se ao ativar notificações aparece **"Falha ao obter chave de notificação"** ou similar:

1. **Edge Function deployada?** → A função `notify-new-workout` deve aparecer em **Supabase → Edge Functions**. Se não, rode `npx supabase functions deploy notify-new-workout`.
2. **VAPID_KEYS_JWK configurado?** → Em **Supabase → Project Settings → Edge Functions → Secrets**, deve existir o secret `VAPID_KEYS_JWK` com o JSON gerado por `deno run scripts/generate-vapid-jwk.ts`.
3. **App usando Supabase na nuvem?** → O `.env` deve ter `VITE_SUPABASE_URL` apontando para `https://SEU_PROJETO.supabase.co` (não localhost).

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
