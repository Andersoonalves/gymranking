/**
 * Versão do build. Os `__APP_*__` são injetados pelo vite.config; em teste (e em
 * qualquer runtime fora do bundle) não existem, daí a checagem de typeof.
 */
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
export const APP_COMMIT = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "";
export const APP_BUILT_AT = typeof __APP_BUILT_AT__ !== "undefined" ? __APP_BUILT_AT__ : "";

/** Detalhe que vai no `title` da versão — é o que se pede em suporte. */
export function formatVersionTitle(version: string, commit: string, builtAt: string): string {
  const partes = [`Versão ${version}`];
  if (commit) partes.push(`commit ${commit}`);
  if (builtAt) {
    const data = new Date(builtAt);
    if (!Number.isNaN(data.getTime())) {
      partes.push(
        data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      );
    }
  }
  return partes.join(" · ");
}

export const versionTitle = () => formatVersionTitle(APP_VERSION, APP_COMMIT, APP_BUILT_AT);
