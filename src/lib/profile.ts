/**
 * Perfil pronto para aparecer no grupo: nome de verdade e foto. Sem linha em
 * `profiles` (conta criada sem o trigger) conta como incompleto. Nome com "@"
 * é o fallback do `handle_new_user` — o e-mail no lugar do nome.
 */
export function isProfileComplete(
  profile: { display_name: string | null; avatar_url: string | null } | null | undefined,
): boolean {
  if (!profile) return false;
  const name = profile.display_name?.trim() ?? "";
  return name.length >= 2 && !name.includes("@") && !!profile.avatar_url;
}
