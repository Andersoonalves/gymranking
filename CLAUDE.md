# CLAUDE.md

FitRank — app de treinos com grupos e ranking. Vite + React 18 + TS + Tailwind + shadcn/ui,
backend Supabase. Ver `README.md` para setup e `docs/requisitos-app-treinos.md` para requisitos.

## Comandos

```bash
npm run dev     # porta 8080
npm test        # vitest run
npm run lint    # deve ficar em 0 erros
npm run build
```

Rodar `npm run lint` e `npm test` antes de considerar uma mudança pronta.

## Idioma

Código, tipos e nomes de função em inglês. Strings de UI, comentários e mensagens de commit
em **português**. Toasts e textos visíveis ao usuário sempre em português.

## Convenções

**Dados sempre via hook em `src/hooks/`.** Cada tabela tem seu hook com TanStack Query
(`useWorkouts`, `useGroups`, `useBodyProgress`, `useTrainingPrograms`…). Componentes não
chamam `supabase.from()` direto — se falta um acesso, estenda o hook existente.

**Lógica pura vai para `src/lib/`.** `ranking.ts` (períodos e classificação), `exercises.ts`,
`workout-templates.ts`, `export-workouts.ts`. É o único lugar com testes e onde novos testes
devem entrar — nada de I/O aqui.

**Tipos do Supabase são gerados.** `src/integrations/supabase/types.ts` e `client.ts` não se
editam à mão; regerar com o Supabase CLI. Se um `supabase.from(...)` ou `.rpc(...)` reclamar
de tipo, a causa provável é tipos desatualizados — regere, não faça cast para `any`.

**`src/components/ui/` é boilerplate shadcn.** Não editar à mão e não lintar (já está com
override no `eslint.config.js`). Componentes não usados foram removidos; adicione de volta via
`npx shadcn@latest add <componente>` quando precisar, junto com a dependência Radix.

**Sem `any`.** Para erro em `catch`, use `errorMessage()` de `@/lib/utils`.

## Rotas

Duas camadas. `App.tsx` cuida das públicas (`/login`, `/signup`) e de `/admin`;
`ProtectedShell.tsx` cuida das rotas autenticadas dentro do `MainLayout`
(`/`, `/rankings`, `/treinos`, `/settings`, `/progresso`).

Páginas fora do caminho crítico são `lazy()` com `<Suspense fallback={<PageLoader />}>`.
**Nova página = rota lazy**, exceto Login e Index. Não duplicar o spinner: use `PageLoader`.

## Grupo ativo

Quase todo fluxo depende de um grupo selecionado, guardado em `localStorage` sob
`GROUPS_STORAGE_KEY` (`src/lib/constants.ts`). Sem grupo, `ProtectedShell` renderiza `Index`
direto, fora do layout com abas. Query keys de dados de grupo incluem o `groupId`.

## Banco e segurança

Migrations em `supabase/migrations/`, aplicadas em ordem de timestamp no nome. **Toda tabela
nova precisa de `ENABLE ROW LEVEL SECURITY` + policies na mesma migration** — o padrão é
`user_id = auth.uid()` para dados pessoais e checagem de participação no grupo para dados
compartilhados. Cuidado com recursão em policies de `group_members`: use a função
`get_my_group_ids()` em vez de subquery na própria tabela (ver migration
`20260221100000_fix_group_members_rls_recursion.sql`).

Edge Functions (`supabase/functions/`) rodam em Deno com imports por URL — não passam pelo
`tsc` do app. A `admin-users` valida o JWT com `getClaims` e confere o papel `admin` na
`user_roles` **antes** de usar a service role key. Manter essa ordem em qualquer rota admin nova.

## PWA

`vite-plugin-pwa` em modo `injectManifest`; o service worker é `src/sw.ts` (escrito à mão) e o
update é `registerType: "prompt"` — quem mostra o aviso é `PWAUpdatePrompt`. Mudança em `sw.ts`
exige rebuild para valer.

`vite.config.ts` injeta `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` via `define` com
fallback embutido, porque o service worker não enxerga `import.meta.env` em runtime.
