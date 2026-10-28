# tailwind.config.ts — o que entra em `theme.extend`

Fonte: `@keyframes`/`--animate-*`/`--ease-*` do CSS renderizado de fitness.aniq-ui.com. O site usa
Tailwind v4 (`--animate-slideUp: slideUp .3s cubic-bezier(.87,0,.13,1)`); aqui traduzido para v3.
Manter os keyframes atuais do FitRank (`rise-in`, `bar-in`, `ring-draw`, `flame`, `glow-pulse`,
`sheen`, `pop-in`) — já são equivalentes aos "figure in" do site (1–1.1s, `cubic-bezier(.2,.8,.2,1)`).

## fontFamily
```ts
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
}
```
Remover Archivo/IBM Plex Mono. Google Font: trocar o `@import` do `index.css` por
`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap` (pesos usados no site: 400/500/600/700, variável 100–900).
`serif` pode apontar para Inter (não usado).

## borderRadius
Base `--radius: .625rem`. Escala do site: sm .25 / md .375 / lg .5 / xl .75 / 2xl 1 / 3xl 1.5rem.
```ts
borderRadius: {
  sm: 'calc(var(--radius) - 4px)',   // 6px
  md: 'calc(var(--radius) - 2px)',   // 8px
  lg: 'var(--radius)',               // 10px
  xl: '0.75rem',                     // 12px  botões grandes/pílulas de nav
  '2xl': '1rem',                     // 16px  cards
  '3xl': '1.5rem',                   // 24px  hero card
}
```

## colors (adicionar aos existentes)
```ts
'primary-text': 'hsl(var(--primary-text))',
amber: 'hsl(var(--amber))',
success: 'hsl(var(--success))',
warning: 'hsl(var(--warning))',
info: 'hsl(var(--info))',
track: 'hsl(var(--track))',
```

## boxShadow
Manter `2xs…2xl` ligados a `var(--shadow-*)` (já está). Adicionar:
```ts
glow: '0 0 24px -4px var(--accent-glow)',          // só dark (no claro --accent-glow é transparent)
'rim-inset': 'inset 0 1px 0 0 rgb(255 255 255 / 0.9)', // sidebar-card-rim claro; dark: rgb(255 255 255 / 0.05)
```
Remover uso de `.shadow-hard*` (sombra dura "Placar") — Kinora não usa.

## backgroundImage
```ts
backgroundImage: {
  'card-surface': 'var(--card-gradient)',
  'card-rim': 'var(--card-rim)',
  'card-sheen': 'var(--card-sheen)',
  'panel-glass': 'var(--panel-glass)',
  'cta-gradient': 'var(--cta-gradient)',
  'stat-bar': 'var(--stat-bar-gradient)',
}
```
Card com borda em gradiente (padrão do site, classe `card`): camadas
`background-image: sheen, glare, card-gradient, card-rim; background-clip: padding-box ×N, border-box; border: 1px solid transparent`. Receita em `DESIGN.md §7`.

## transitionTimingFunction / transitionDuration
```ts
transitionTimingFunction: {
  'out-expo': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  collapse: 'cubic-bezier(0.87, 0, 0.13, 1)',
},
transitionDuration: { 150: '150ms', 200: '200ms', 300: '300ms' },
```
Default do site: `.15s cubic-bezier(.4,0,.2,1)` (igual ao Tailwind).

## keyframes (novos)
```ts
keyframes: {
  'fade-in-fast': { from: { opacity: '0' }, to: { opacity: '1' } },
  'collapsible-down': { from: { height: '0' }, to: { height: 'var(--radix-collapsible-content-height)' } },
  'collapsible-up': { from: { height: 'var(--radix-collapsible-content-height)' }, to: { height: '0' } },
  shine: { '0%': { backgroundPosition: '0 0' }, '50%': { backgroundPosition: '100% 100%' }, '100%': { backgroundPosition: '0 0' } },
  ping: { '75%, 100%': { transform: 'scale(2)', opacity: '0' } },
  'figure-in': { from: { opacity: '0' }, to: { opacity: '1' } },
},
animation: {
  'fade-in-fast': 'fade-in-fast .2s ease-in',
  'collapsible-down': 'collapsible-down .3s cubic-bezier(.87,0,.13,1)',
  'collapsible-up': 'collapsible-up .3s cubic-bezier(.87,0,.13,1)',
  shine: 'shine 3s linear infinite',
  'figure-in': 'figure-in 1.1s cubic-bezier(.2,.8,.2,1) .15s both',
  pulse: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
},
```
`accordion-*` existentes: trocar `0.2s ease-out` por `.3s cubic-bezier(.87,0,.13,1)` para igualar.

## Respeitar `prefers-reduced-motion`
O site tem toggle "Animations" em Settings. No FitRank: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }`.
