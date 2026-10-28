-- Banco de variações da dieta: alternativas de troca por categoria
-- ("Café da manhã", "Proteínas", "Pré-treino"...), sem vínculo com aderência.
--
-- Sem versionamento: variação é referência de consulta, não plano cumprido por
-- dia — editar e apagar são UPDATE/DELETE diretos, o passado não depende delas.

CREATE TABLE public.diet_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (char_length(trim(category)) BETWEEN 1 AND 40),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  -- Mesmo formato de diet_meals.items: [{"name": "Arroz", "qty": "150 g"}]
  items JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 30),
  -- Observação livre: "≈ 450 kcal", "Mais leve", "Boa para treino pesado".
  note TEXT CHECK (char_length(note) <= 120),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A tela lista tudo do dono de uma vez; user_id também serve às policies.
CREATE INDEX diet_variations_user_idx ON public.diet_variations (user_id);

ALTER TABLE public.diet_variations ENABLE ROW LEVEL SECURITY;

-- Escrita só do dono; leitura acompanha o opt-in da dieta (can_view_diet já
-- checa diet_shared + grupo em comum).
CREATE POLICY "Users can manage own diet variations"
  ON public.diet_variations
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Group peers can view shared diet variations"
  ON public.diet_variations
  FOR SELECT
  USING (public.can_view_diet(user_id));

-- Teto antiabuso no padrão de 20260812130000_dieta.sql.
--
-- ponytail: contagem em BEFORE INSERT tem janela de corrida — dois inserts
-- concorrentes podem passar do teto por 1. Aceitável para teto antiabuso.

CREATE OR REPLACE FUNCTION public.enforce_diet_variation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.diet_variations
    WHERE user_id = NEW.user_id
  ) >= 80 THEN
    RAISE EXCEPTION 'Seu banco de variações já tem 80 opções, que é o limite. Apague uma antes de criar outra.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_diet_variation_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER diet_variations_limit
  BEFORE INSERT ON public.diet_variations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_diet_variation_limit();
