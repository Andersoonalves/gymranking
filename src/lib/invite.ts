/** Link de convite com deep-link: logado entra direto, deslogado cai no cadastro com o código. */
export function inviteLink(code: string, origin: string): string {
  return `${origin}/join?code=${encodeURIComponent(code.trim().toUpperCase())}`;
}
