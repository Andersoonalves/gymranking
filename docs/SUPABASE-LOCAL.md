# Conectar o projeto ao Supabase local

Assim você usa o banco e o Auth rodando na sua máquina em vez do projeto na nuvem.

## Pré-requisitos

- **Docker** (ou compatível: OrbStack, Podman, Rancher Desktop) instalado e em execução.
- **Supabase CLI** (pode usar sem instalar globalmente):

  ```bash
  npx supabase --version
  ```

## Passo a passo

### 1. Subir o Supabase local

Na raiz do projeto (onde está a pasta `supabase/`):

```bash
npx supabase start
```

Na primeira vez isso pode demorar (baixa as imagens). Quando terminar, o terminal mostra algo como:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

As migrations em `supabase/migrations/` são aplicadas automaticamente.

### 2. Pegar a URL e a chave anon

Se você fechou a saída do `start`, rode:

```bash
npx supabase status
```

Use:

- **API URL** → será o `VITE_SUPABASE_URL`
- **anon key** (a chave longa que começa com `eyJ...`) → será o `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Configurar o app para usar o Supabase local

Crie na raiz do projeto o arquivo **`.env.local`** (ele sobrescreve o `.env` em desenvolvimento):

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<cole aqui o anon key do passo 2>
```

Se o app usar `VITE_SUPABASE_PROJECT_ID`, pode deixar em branco ou usar `local`.

### 4. Reiniciar o app

Pare o `npm run dev` (Ctrl+C) e suba de novo:

```bash
npm run dev
```

O front passa a usar o Supabase local (banco + Auth).

---

## Úteis

| Comando              | Uso                          |
|----------------------|------------------------------|
| `npx supabase start` | Sobe o stack local           |
| `npx supabase stop`   | Para e remove os containers  |
| `npx supabase status`| Mostra URLs e chaves         |
| **Studio**           | http://localhost:54323       |

No Studio você acessa o banco, Auth, Storage, etc. do ambiente local.

---

## Voltar para a nuvem

Para usar de novo o projeto Supabase na nuvem:

- Apague ou renomeie `.env.local`, ou
- Comente/remova as linhas do Supabase em `.env.local`

e reinicie o `npm run dev`. O app voltará a usar o `.env` (URL e chave da nuvem).
