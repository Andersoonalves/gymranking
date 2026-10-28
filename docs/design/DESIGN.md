# Design system — Kinora (fitness.aniq-ui.com) → FitRank

Fonte: `https://fitness.aniq-ui.com/en/dashboard` (+ `/dashboard/workouts`, `/progress`, `/settings`, `/auth/login`), login demo "Member".
Método: CSS publicado (`:root` e `.dark`, keyframes, `--animate-*`, `--ease-*`) + texto/árvore renderizados + screenshots em `screens/`.
**Limite:** o navegador do pane não executa JS arbitrário, então não houve `getComputedStyle` por elemento. Valores de tokens são lidos do CSS (fato); medidas de layout (larguras, paddings) vêm dos screenshots a 1024×700 (aproximação, marcadas ~). Hover/foco não foram capturados ao vivo — estados abaixo são inferência a partir das regras CSS (`hover:bg-[var(--nav-active-bg)]`, etc.).

> Achado: o FitRank já usa lima + escuro ("Placar": Archivo 900 caixa-alta, IBM Plex Mono, sombra dura de botão). O Kinora é a mesma família de cor, mas **sem** caixa-alta pesada nem sombra dura: tipografia Inter sóbria, cards de vidro com borda de gradiente, brilho sutil no escuro.

## 1. Paleta
Marca: lima **#9ae600** (`--primaryColor`, hover claro #8ad000, hover escuro #adff00). Texto sobre lima: **#101401**. Lima como *texto* no claro: **#4c7a02** (`--accent-text`) — #9ae600 sobre branco não passa contraste. Âmbar secundário #d9a400 (claro) / #faab02 (escuro). Gradiente de série (splits) lima→verde→azul: #8fbf00 #5c9e0a #2f8f3f #0f7d6e #12678f #2f4f96 (claro).

| Token | Claro | Escuro |
|---|---|---|
| background | #f5f7f8 `200 18% 97%` | #050506 `240 9% 2%` |
| foreground | #0a0a0a `0 0% 4%` | #f5f5f5 `0 0% 96%` |
| card (--surface) | #fff | #0e1011 `200 10% 6%` |
| popover / surface-raised | #fff / #f2f4f5 | #121415 `200 8% 8%` |
| secondary / field | #eef1f2 `195 13% 94%` | #1c1d1f `220 5% 12%` |
| muted | #f2f4f5 | #262626 (--control-bg) |
| muted-foreground | #636768 `192 2% 40%` | #8e8e8e `0 0% 56%` |
| text-secondary | #40433f | #d5d8d7 |
| border | #e5e7eb `220 13% 91%` | rgba(255,255,255,.10) |
| input border | #e5e7eb | #474747 (bg #191919) |
| primary / ring | #9ae600 `80 100% 45%` | #9ae600 |
| destructive | #ef4444 | #f87171 |
| success (trend) | #22c55e | #34d399 |
| info/insight | #3b82f6 | #60a5fa |
| sidebar bg | #eef1f2 | #000 |

Alertas (escuro): success bg #22c55e2e / borda #4ade80; error #ef444438/#f87171; warning #eab30838/#facc15; info #3b82f63d/#60a5fa. HSL prontos em `tokens.css`.
Gráficos: série atual = lima #9ae600, série comparativa = cinza (#b0b0b0 escuro / #e2e8f0 claro), grid `#00000012` claro / `#ffffff0d` escuro; tooltip bubble #313334 texto #fff; trilho de anel/barra `--track` #e6e9e6 / #232325.

## 2. Tipografia
- Sans: **Inter** (Google Font via next/font, pesos 400/500/600/700, variável 100–900). Fallback `ui-sans-serif, system-ui, sans-serif`. (IBM Plex Sans Arabic só carrega em RTL — ignorar.) Mono: stack do sistema, quase não usada.
- Escala (Tailwind padrão do site): xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30px. Tracking: tight -.025em (títulos), wide .025em, wider .05em (rótulos).
- Uso visto: saudação 16px `muted`; H1 de página ~30–36px/600 (“Fitness Overview”, “Settings”); título de card ~18px/600; rótulo de métrica 14px muted; valor de métrica ~28–32px/500 com unidade (“BPM”, “%”, “h/m”) em ~12px muted ao lado; legenda de status 14px/500 em lima (“Good”, “Optimal”). Caixa normal — **sem uppercase**, exceto wordmark “K I N O R A” (letter-spacing largo, ~.3em) e DEMOS/labels pequenos.
- Numerais grandes sem fonte mono. Usar `tabular-nums` em valores que animam.

## 3. Raios
`--radius .625rem` (10px). Escala: sm 4 · md 6 · lg 8 · xl 12 · 2xl 16 · 3xl 24. Card de página ~16–24px; item de nav ~12px; botão/seletor “Today” pílula ~12–999; ícone-chip círculo; input ~10px; avatar ~12px (squircle).

## 4. Sombras e profundidade
Quase não há sombra projetada. Profundidade vem de: (a) **rim** (borda de gradiente 1px), (b) **gradiente de superfície** (claro #fff→#fafbfa; escuro #08090a→#000), (c) **glow interno** no escuro `inset 0 0 46px #c8cdd20d, inset 0 0 13px #c8cdd20a`, (d) **glare radial** nos cantos superior/inferior direito `radial-gradient(48% 52% at 100% 0, #c8cdd21f, transparent 72%)`. Sombras Tailwind v4 padrão para popovers/menus. Brilho lima (`--accent-glow #9ae60073`) só no escuro, em chips e item ativo.

## 5. Gradientes
- Card escuro: `linear-gradient(180deg,#08090a 0%,#010102 40%,#000 100%)`; claro `#fff→#fafbfa`.
- Rim claro: `140deg, #00000016→#0000000f` (cinza 6–9%); escuro: `140deg, #fff6 0%, #ffffff42 12%, #ffffff2e 26%, … #ffffff1f 58–72%, #ffffff2b 100%` — borda mais clara no canto superior-esquerdo.
- Sheen escuro: `128deg, #ffffff24 0%→transparent 50%`.
- CTA claro: `180deg #70b10f→#5b9c0a`; stat-bar: `180deg lima → #cdf380(claro)/#4c7a02(escuro) 55% → lima 16%`.
- Sidebar: `135deg` com faixa de brilho estreita em 10–15% (`#000 10% → #c8cdd21f 12.5% → #000 15%`) = reflexo diagonal no canto sup. esq. (visível nos screenshots dark). Divisor horizontal `transparent→#fff3→transparent`.
- Item ativo da sidebar (dark): fundo `linear-gradient` lima→verde-musgo translúcido (~#9ae60030→#4c7a0230) + borda lima ~#9ae60066 + ícone/texto lima.

## 6. Glass / blur / bordas
`panel`: `background-image: panel-glass, panel-rim; backdrop-filter: blur(8px); border:1px solid transparent` (claro `#fafbfbb8→#f3f5f6c7`; escuro `#0a0c0d4d→#05060757`). Header e overlays usam `blur(8px)`. Borda padrão 1px `--border`. Rim em gradiente só em cards/painéis; inputs `field-rim inset 0 0 0 1px #0000000a` (claro) / `#ffffff0d` (escuro). Grão: card escuro tem `radial-gradient(circle at 1px 1px,#ffffff0c 1px,transparent 0)` + vinheta radial `78% 78% at 50% 45%` e tinta lima 6.5%.

## 7. Layout
- Shell: sidebar fixa esquerda **~215px** (colapsável via botão painel no header), header **~70px** com borda inferior, conteúdo com padding ~16–20px, grid de cards com gap ~16px; cards 2 colunas ≥tablet, 3 em settings; hero card full-width com imagem de corpo/atleta recortada à direita (NÃO copiar a imagem).
- Sidebar: logo (chevron lima + “KINORA”), itens 48px de altura (~ícone 20 + label 14px/500, gap 12), item ativo = pílula com rim; bloco “Current Streak” (card com rim+dias M T W T F S S) e “Hydration” no rodapé; `DEMOS`/Logout.
- Header: toggle sidebar · abas de seção (Overview/Programs/Exercises, sublinhado lima 2px no ativo) · busca centro (input pílula ~200px, ícone lupa) · bandeira idioma · toggle tema (lua/sol) · sino · avatar+chevron.
- Breakpoints: padrão Tailwind (sm640 md768 lg1024 xl1280). Mobile: sidebar vira drawer.
- Receita de card com rim (CSS puro, vale p/ light e dark):
```css
.k-card { border:1px solid transparent; border-radius:1rem;
  background-image: var(--card-sheen,none), var(--card-gradient), var(--card-rim);
  background-origin: padding-box, padding-box, border-box;
  background-clip: padding-box, padding-box, border-box;
  box-shadow: var(--card-edge-glow); }
```

## 8. Componentes e estados
- **Botão primário**: fundo lima #9ae600, texto #101401, 600, raio xl (~12px), altura ~40–44px; hover `#8ad000` claro / `#adff00` escuro (+glow no escuro); ativo `scale(.98)` (inferência); disabled opacidade ~.5 + spinner “Loading Signing in…”. Variante CTA claro: `cta-gradient`. Sem sombra dura.
- **Botão secundário/ghost**: fundo `--control-bg` (#f7f9fb / #262626), hover `--control-bg-hover` (#f3f3f3 / #3a3a3a); “Log a reading” = outline borda `--border`, pílula; seletor “Today/Week” = pílula `--field-bg` + ícone calendário + chevron.
- **Card de stat**: ícone em chip circular (disco com gradiente `chip-disc-top→bottom`, anel `--chip-ring` lima 26–42%, glifo com gradiente lima, sombra do glifo `#00000024`); rótulo muted 14px; valor 28–32px/500 + unidade; delta “+109% vs last week” (lima = bom, laranja #f97316 = queda, `--trend-*`); legenda de status lima. Três métricas dentro de um painel interno (`surface-raised`) com divisórias verticais finas.
- **Nav item ativo**: claro = pílula branca (`--nav-active-bg` #fff) com rim e leve tinta lima, texto/ícone lima-escuro #4c7a02; escuro = `--nav-active-bg #1c1d1f` + gradiente lima + texto #9ae600. Hover: `bg-[var(--nav-active-bg)]`. Inativo: ícone 20px + texto 14px `text-secondary`.
- **Input**: altura ~44, raio ~10, fundo `--field-bg` (#eef1f2 / #171818), borda `--input-border`, rim inset; foco anel lima (inferência: `--ring`); ícone leading; olho de senha; checkbox lima. Placeholder muted.
- **Toggle**: trilho lima #9ae600 ligado, bolinha branca; desligado `--track`.
- **Badge**: pílula pequena ~12px/500, fundo tinta (`--chip-lime #64a00329` / `--chip-amber`), borda anel; “Pro Member” = fundo escuro + ícone coroa lima; “To do” neutro.
- **Tabela/lista**: linhas com regra `color-mix(text 8%, transparent)`, `--table-hover-bg #f7fafc`; “Today's Workout” = linhas-card (thumb 56px raio 8 + nome 600 + músculo em lima + séries à direita + anel de progresso mini 0%).
- **Gráficos**: linha lima 2px sobre grid pontilhado fraco, pontos nos vértices, eixo 12px muted, legenda com bolinhas; barras com `stat-bar-gradient` (topo lima → base some); anéis concêntricos (Activity) em 3 tons de lima (#9ae600 / #64a003 / #4c7a02) sobre trilho `--track`; donut de macros lima/verde-escuro/cinza; radar de foco muscular.
- **Seletor de cor de destaque** (Settings): 6 círculos (lima ✓, vermelho, laranja, ciano, roxo, rosa) — ajusta `--primaryColor`. Não precisa copiar.

## 9. Motion e efeitos (valores do CSS publicado)
- **Default**: `transition-duration .15s`, easing `cubic-bezier(.4,0,.2,1)`; escalas `--ease-in .4,0,1,1` · `--ease-out 0,0,.2,1` · `--ease-in-out .4,0,.2,1`. Específicos: `transition:all .2s`, `transform .3s`/`.2s`, `background .2s`, `opacity .1s`, `width` (barras), `filter`.
- **Entrada de figuras** (hero/plan imagem): `heroFigureIn 1.1s cubic-bezier(.2,.8,.2,1) .15s both` (opacity 0→1); `planFigureIn 1s … .12s`. Cards entram com o mesmo easing (FitRank já tem `rise-in .5s`).
- **Collapsible/accordion**: `slideDown/slideUp .3s cubic-bezier(.87,0,.13,1)` (altura Radix). `fadeInFast .2s ease-in`.
- **Loop**: `spin 1s linear`, `pulse 2s cubic-bezier(.4,0,.6,1) infinite` (opacidade →.5), `ping 1s cubic-bezier(0,0,.2,1) infinite` (scale 2, opacidade 0), `shine` (background-position 0→100%→0, para brilho em borda/CTA).
- **Toasts** (react-toastify): bounce/slide/zoom/flip padrão; barra de progresso `scaleX 1→0 linear`; spinner .65s. Substituir pelo sonner/toast atual do FitRank — não copiar.
- **Números/gráficos**: valores aparecem em contagem (placeholders vazios no SSR — “/ 1,000”, “%”, “kcal” sem número — confirmam preenchimento client-side); anéis/barras/linhas desenham ao montar (inferência a partir de `stroke-dashoffset`/`width` transitions; duração não medida, usar ~1.1s `out-expo` como o `ring-draw` do FitRank). Hover em barra mostra bubble #313334.
- **Tema**: troca claro/escuro por classe `.dark` no `<html>`; transição de cor implícita (.15s). Toggle “Animations” em Settings desliga entradas → implementar `prefers-reduced-motion`.
- **Foco**: link “Skip to main content” `sr-only focus:not-sr-only` — manter acessibilidade.

## 10. Keep / Change / Do-not-copy
**Keep (FitRank já alinhado):** lima como primária e dark como padrão; mobile-first com bottom nav; `rise-in`/`bar-in`/`ring-draw`/`pop-in`; tokens shadcn em HSL; `safe-area-*`; PWA; textos pt-BR.
**Change:** fonte Archivo/IBM Plex Mono → **Inter**; remover caixa-alta pesada (`.display-title`) e `.mono-label` para rótulo sóbrio sentence-case 12–14px; remover sombra dura (`.shadow-hard*`, `active-hard`) → botão chapado lima + hover/escala; bg claro `#f5f7f8` (era bege 42 38% 94%), escuro `#050506` (era marrom-quente 36 14% 5%), bordas frias/neutras; raio 12px→10px (cards 16px); cards com gradiente + rim; dark com glow interno; item ativo da nav = pílula com rim; primária escura `75 85% 63%` → `#9ae600` e `--primary-foreground` `#101401`; âmbar substitui laranja de acento (`accent` do FitRank era laranja 21 100% 44% — passa a ser tinta lima).
**Do-not-copy:** imagens (corpo anatômico, atletas, fotos de exercício, avatares), logo/wordmark/ícone Kinora, textos de marketing, nomes “Kinora/Aniq UI”, estrutura de rotas/menu (AI Assistant, Sleep, Health…), código/JS/CSS minificado do template, hashes de classes (`_7oXR-q_card`), bandeiras/ícones. Só tokens e padrões visuais acima. Ícones: continuar com lucide do projeto.
