# Mapa FitRank → padrão Kinora

Pré-requisito comum (feito UMA vez, antes dos blocos, por quem ficar com tokens): colar `tokens.css` em `src/index.css`, aplicar `tailwind-extend.md` em `tailwind.config.ts`, trocar a fonte para Inter. **Esses 2 arquivos + `index.html` (se tiver `<link>` de fonte) ficam fora dos 3 blocos** (dono único = worker de tokens). Depois disso, blocos A/B/C não se sobrepõem. `src/components/ui/` não se edita (CLAUDE.md) — o visual vem dos tokens/classes nos consumidores.

Utilitários novos sugeridos em `index.css` (dono: worker de tokens): `.k-card` (receita DESIGN §7), `.k-panel` (glass blur 8px), `.k-chip` (disco de ícone com anel lima), `.k-nav-active`, `.k-stat-value` (tabular-nums). Blocos só consomem essas classes.

Padrões (ver DESIGN.md): **P1** card rim+gradiente · **P2** stat com chip de ícone · **P3** nav pílula ativa · **P4** botão lima chapado · **P5** input campo · **P6** badge/pílula · **P7** gráfico lima + trilho · **P8** painel glass/overlay · **P9** entrada `rise-in`/figure-in.

## Bloco A — shell, home, auth, compartilhados (~3.4k linhas)
| Arquivo | Padrão |
|---|---|
| `src/components/MainLayout.tsx` | P3 sidebar (dark `#000`+reflexo diagonal) e header 70px com abas/blur P8; bottom nav mobile com pílula ativa |
| `src/pages/Index.tsx` | P1 hero card + P2 stats + P7 anel/barras; P9 stagger de cards |
| `src/pages/Login.tsx`, `Signup.tsx`, `CompleteProfile.tsx`, `Join.tsx`, `NotFound.tsx` | P5 inputs, P4 botão, P1 card de auth, layout dividido (marca + form) |
| `src/components/ProtectedShell.tsx`, `PageLoader.tsx`, `NavLink.tsx`, `BrandMark.tsx`, `EmptyState.tsx`, `EcgBackground.tsx`, `InitialAvatar.tsx`, `AvatarUpload.tsx`, `GoogleSignInButton.tsx`, `ShareInviteButton.tsx`, `ThemeProvider.tsx` | P1/P4/P6; wordmark espaçado (sem copiar logo); avatar squircle |
| `src/components/FeatureTour.tsx`, `PWAInstallPrompt.tsx`, `PWAUpdatePrompt.tsx` | P8 painel glass, P4 |
| `src/pages/Admin.tsx` | P1 + tabela (linhas regra 8%, hover) |

## Bloco B — treinos, ranking, grupos (~4.0k linhas)
| Arquivo | Padrão |
|---|---|
| `src/pages/Treinos.tsx` | P1 + linhas-card de exercício (thumb, músculo em lima, séries à direita, anel mini), "Weekly Split" em pílulas, P7 volume |
| `src/components/RegisterWorkoutSheet.tsx`, `LiveWorkoutSheet.tsx`, `ExerciseEditorSheet.tsx`, `ExercisePickerSheet.tsx` | P8 sheet/modal glass (`.sheet-desktop-modal` mantém), P5, P4, P6 |
| `src/components/WorkoutCalendar.tsx` | P1 + dias com chip lima (streak M T W…) |
| `src/pages/Rankings.tsx` | P1 lista, P6 posição/medalhas (âmbar/ouro `#c9a24a`), P2 pódio |
| `src/components/ChallengeCard.tsx`, `ChallengesSection.tsx`, `CreateChallengeSheet.tsx` | P1, P7 barra de progresso (`stat-bar`), P4 |
| `src/components/CreateGroupDialog.tsx`, `JoinGroupDialog.tsx`, `MemberProfileSheet.tsx`, `AchievementsSheet.tsx` | P8, P5, P6 |

## Bloco C — progresso, dieta, ajustes, fotos (~3.1k linhas)
| Arquivo | Padrão |
|---|---|
| `src/pages/Progresso.tsx` | "Performance Overview": P2 duas métricas + P7 linha lima × cinza com legenda; grade de fotos |
| `src/pages/Settings.tsx` | cards de seção em grid 3 col com linhas ícone-chip+título+descrição+chevron, toggles lima, linha destrutiva em vermelho; card de perfil com badge "Pro" |
| `src/pages/Dieta.tsx` ⚠ | **tem mudanças não commitadas de outra frente** (git status inicial) — aplicar só depois de commitada, ou só trocar classes sem mexer em lógica; P1, P2, donut de macros P7 |
| `src/components/DietMealList.tsx` | linhas-card P1 |
| `src/components/PhotoCompare.tsx`, `PhotoLightbox.tsx`, `ProgressPhotoUpload.tsx`, `ImageCropDialog.tsx` | P1 tiles raio 12–16, P8 lightbox glass, P4 |

Tamanho: A ≈ 3.380, B ≈ 3.960, C ≈ 3.120 linhas. Arquivos fora dos blocos: `src/index.css`, `tailwind.config.ts`, `index.html` (tokens); `src/components/ui/*` (intocado); hooks/lib (sem UI).
Testes só cobrem `src/lib/` — mudança visual não deve tocar lib; rodar `npm run lint && npm test && npm run build` ao fim de cada bloco.
