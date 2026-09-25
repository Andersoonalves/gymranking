-- O restore no VPS trouxe a função handle_new_user, mas não o trigger em
-- auth.users (o dump só cobre o schema public). Contas criadas depois disso
-- nasceram sem linha em profiles e aparecem como "Sem nome" no ranking.
-- Idempotente: recria o trigger e cria o perfil de quem ficou sem.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sem avatar e, na falta de nome, com o e-mail: o app pede nome e foto no
-- próximo acesso (isProfileComplete em src/lib/profile.ts).
INSERT INTO public.profiles (user_id, display_name, avatar_url)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    u.email
  ),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(u.raw_user_meta_data->>'picture', '')
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
