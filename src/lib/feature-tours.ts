/**
 * Tours de novidades: o que mudou no app para quem já usava.
 *
 * Para anunciar uma feature nova, adicione um tour em FEATURE_TOURS com um `id`
 * novo e `releasedAt` no dia do deploy. Quem criou a conta depois dessa data não
 * vê (para essa pessoa não é novidade, é o app), e quem já viu não vê de novo —
 * exceto quando pede pelos Ajustes.
 */

export type TourStep = {
  title: string;
  body: string;
  /** Nome do ícone lucide que o componente resolve (ver ICONS em FeatureTour). */
  icon: "utensils" | "target" | "users" | "layout";
  /**
   * Valor do `data-tour-id` do elemento destacado. O mesmo id pode estar em mais
   * de um elemento (barra do mobile e sidebar do desktop, por exemplo): o tour
   * destaca o primeiro que estiver visível. Sem alvo na tela, o passo aparece
   * centralizado, sem furo.
   */
  target?: string;
  /** Rota onde o alvo mora. O tour navega até ela antes de medir. */
  route?: string;
};

export type FeatureTour = {
  id: string;
  /** Data do deploy, em ISO (YYYY-MM-DD). */
  releasedAt: string;
  title: string;
  subtitle: string;
  steps: TourStep[];
  /** Rota aberta no fim do tour, se houver. */
  cta?: { label: string; path: string };
};

export const FEATURE_TOURS: FeatureTour[] = [
  {
    id: "dieta",
    releasedAt: "2026-08-12",
    title: "Dieta no FitRank",
    subtitle: "Agora o app acompanha o que você come, não só o que você treina.",
    steps: [
      {
        icon: "layout",
        title: "Dieta é a última aba",
        body: "Aqui fica o seu plano de refeições e o acompanhamento do dia.",
        target: "nav-dieta",
        route: "/",
      },
      {
        icon: "layout",
        title: "Registrar treino mudou de lugar",
        body: "Saiu do meio da barra e virou este botão flutuante, no canto inferior direito.",
        target: "registrar-treino",
        route: "/",
      },
      {
        icon: "utensils",
        title: "Monte seu plano de refeições",
        body: "Cada refeição tem horário e lista de itens com quantidade — arroz 150 g, frango 200 g. Pode valer todo dia ou só num dia da semana.",
        target: "dieta-plano",
        route: "/dieta",
      },
      {
        icon: "target",
        title: "Meta de 80% no dia",
        body: "Marque o que cumpriu e acompanhe aqui. Bater 80% das refeições previstas fecha o dia, e dias fechados viram sequência — igual à de treino.",
        target: "dieta-aderencia",
        route: "/dieta",
      },
      {
        icon: "users",
        title: "Mostrar para o grupo é opcional",
        body: "Sua dieta é privada por padrão. Ligando aqui, quem divide grupo com você passa a ver sua aderência e o plano do dia no seu perfil.",
        target: "dieta-compartilhar",
        route: "/dieta",
      },
    ],
    cta: { label: "Começar", path: "/dieta" },
  },
];

export function parseSeenTours(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function serializeSeenTours(ids: string[]): string {
  return JSON.stringify([...new Set(ids)]);
}

/**
 * Próximo tour a mostrar sozinho, ou null. `accountCreatedAt` é o `created_at`
 * do usuário: conta criada depois do lançamento não recebe o aviso.
 */
export function pendingTour(
  tours: FeatureTour[],
  seenIds: string[],
  accountCreatedAt: string | undefined,
): FeatureTour | null {
  const accountDate = accountCreatedAt ? accountCreatedAt.slice(0, 10) : null;
  const candidatos = tours
    .filter((t) => !seenIds.includes(t.id))
    .filter((t) => accountDate === null || accountDate <= t.releasedAt)
    .sort((a, b) => a.releasedAt.localeCompare(b.releasedAt) || a.id.localeCompare(b.id));
  return candidatos[0] ?? null;
}

/** Tour que o botão "Ver novidades" abre: o mais recente, visto ou não. */
export function latestTour(tours: FeatureTour[]): FeatureTour | null {
  const ordenados = [...tours].sort(
    (a, b) => b.releasedAt.localeCompare(a.releasedAt) || b.id.localeCompare(a.id),
  );
  return ordenados[0] ?? null;
}
