-- Cor principal escolhida pelo usuário, para sincronizar entre dispositivos.
-- NULL = usa o lima padrão do app. O CHECK garante formato #RRGGBB, então o
-- valor pode ir direto para as CSS vars sem sanitização no cliente.
ALTER TABLE public.profiles
  ADD COLUMN primary_color text
  CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$');
