/**
 * Marca do FitRank na versão simplificada (barra + pulso), a mesma do
 * `public/brand/favicon.svg`. Vai inline em vez de `<img>` porque o pulso usa
 * `--primary`: assim acompanha a cor que o usuário escolheu no perfil.
 *
 * Tile escuro e barra creme ficam fixos — é a marca. Só o pulso muda de cor.
 * Os ícones de sistema (favicon, PWA) seguem em arquivo com o lime original,
 * porque ali não existe tema para acompanhar.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#0E0D0B" />
      <g transform="translate(-9.14 8.55) scale(0.4114)">
        <g fill="#F5F1E8">
          <rect x="46" y="68" width="108" height="11" rx="5.5" />
          <g>
            <rect x="132" y="48" width="14" height="52" rx="6" />
            <rect x="149" y="54" width="11" height="40" rx="5" />
            <rect x="162" y="60" width="8" height="28" rx="4" />
          </g>
          <g transform="translate(200 0) scale(-1 1)">
            <rect x="132" y="48" width="14" height="52" rx="6" />
            <rect x="149" y="54" width="11" height="40" rx="5" />
            <rect x="162" y="60" width="8" height="28" rx="4" />
          </g>
        </g>
        <g transform="translate(8.45 -87.97) scale(0.9212)">
          <path
            fillRule="evenodd"
            fill="hsl(var(--primary))"
            d="M85.49 116.05L82.72 120.06L77.16 131.79L75.00 133.33L67.90 134.26L68.21 135.19L78.70 136.42L82.10 129.94L82.72 129.94L83.33 137.96L83.95 138.58L83.95 144.75L84.57 145.37L84.57 152.16L85.80 152.78L95.37 136.42L105.86 136.42L109.57 129.63L110.49 131.17L111.73 151.54L112.65 153.09L118.52 143.52L121.60 136.73L122.53 135.80L130.86 134.88L130.56 133.95L120.06 133.33L116.05 139.81L114.81 140.43L112.65 116.05L108.64 122.53L104.32 131.79L103.40 132.72L92.90 132.72L87.96 140.74L87.04 136.73L87.04 130.56L86.42 129.94L85.80 116.36Z"
          />
        </g>
      </g>
    </svg>
  );
}
