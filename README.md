# FitRank

App de treinos com dinâmica social: você registra seus treinos, entra em grupos com amigos
e disputa o ranking de consistência por semana, mês e ano.

PWA instalável, mobile-first, com notificações push.

## Funcionalidades

- **Auth** — cadastro, login, troca de senha, rotas protegidas.
- **Grupos** — criar grupo, entrar por código de convite, alternar grupo ativo.
- **Registro de treino** — um ou mais tipos por lançamento, data/hora, observações, registro retroativo pelo calendário.
- **Treinos salvos** — programas (Treino A, B…) com exercícios, séries, repetições e carga. 202 exercícios em 12 grupos musculares, além de templates prontos (PPL, Upper/Lower, Full Body).
- **Calendário** — visão mensal e anual com destaque nos dias treinados.
- **Rankings** — por semana/mês/ano, com filtro por tipo de treino.
- **Progresso físico** — peso por data, foto de progresso e gráfico de evolução.
- **Admin** — painel de gestão de usuários (listar, criar, resetar senha, excluir).
- **Export/import** — histórico de treinos em JSON.

Requisitos detalhados: [`docs/requisitos-app-treinos.md`](docs/requisitos-app-treinos.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite 5 + `@vitejs/plugin-react-swc` |
| UI | React 18, TypeScript, Tailwind, shadcn/ui (Radix) |
| Estado servidor | TanStack Query |
| Rotas | React Router 6 |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |
| PWA | `vite-plugin-pwa` em modo `injectManifest` (`src/sw.ts`) |
| Testes | Vitest + Testing Library |

## Rodando localmente

Requer Node 18+.

```bash
npm install
cp .env.local.example .env.local   # preencha com as credenciais do Supabase
npm run dev
```

O app sobe em `http://localhost:8080`.

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL da API do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon/publishable |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

O Vite carrega `.env.local` com prioridade sobre `.env`, então dá para manter a nuvem no
`.env` e o ambiente local no `.env.local`.

### Supabase local (opcional)

Para rodar banco e Auth na sua máquina em vez do projeto na nuvem, siga
[`docs/SUPABASE-LOCAL.md`](docs/SUPABASE-LOCAL.md). Precisa de Docker.

```bash
npx supabase start
npx supabase db reset   # aplica todas as migrations de supabase/migrations
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build local |
| `npm run lint` | ESLint |
| `npm test` | Vitest (run único) |
| `npm run test:watch` | Vitest em watch |

## Estrutura

```
src/
  pages/          rotas de tela (Index, Rankings, Treinos, Progresso, Settings, Admin, Login…)
  components/     componentes da aplicação
  components/ui/  primitivas shadcn/ui
  hooks/          hooks de dados (TanStack Query sobre o Supabase)
  contexts/       AuthContext, RegisterWorkoutContext
  lib/            lógica pura: ranking, exercícios, templates, export
  integrations/   client e tipos gerados do Supabase
supabase/
  migrations/     schema e políticas de RLS
  functions/      Edge Functions em Deno (admin-users, notify-new-workout)
```

## Deploy das Edge Functions

Ver [`docs/EDGE-FUNCTIONS-DEPLOY.md`](docs/EDGE-FUNCTIONS-DEPLOY.md).
