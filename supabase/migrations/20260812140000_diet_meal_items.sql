-- Refeição passa a ter lista de itens em vez de uma descrição solta.
--
-- Os itens vão em JSONB na própria linha de diet_meals, e não em tabela filha,
-- porque o plano é versionado trocando a linha inteira (arquiva + insere). Com
-- coluna, a nova versão já nasce com os itens dela e a antiga guarda os seus;
-- com tabela filha, cada edição precisaria clonar as linhas de itens à mão.
-- Nada consulta item isolado, então índice/join não fazem falta.
--
-- Formato: [{"name": "Arroz", "qty": "150 g"}]
ALTER TABLE public.diet_meals
  ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb,
  DROP COLUMN description;

ALTER TABLE public.diet_meals
  ADD CONSTRAINT diet_meals_items_array CHECK (jsonb_typeof(items) = 'array'),
  ADD CONSTRAINT diet_meals_items_limite CHECK (jsonb_array_length(items) <= 30);
