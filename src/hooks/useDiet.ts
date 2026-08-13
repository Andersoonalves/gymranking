import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey, toItems, type DietItem, type DietMeal, type DietMealLog } from "@/lib/diet";

const MEALS_KEY = "diet-meals";
const LOGS_KEY = "diet-logs";

/** Campos que o usuário edita — o resto (vigência, dono) é do hook. */
export type DietMealInput = {
  name: string;
  time_of_day: string | null;
  items: DietItem[];
  day_of_week: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

const MEAL_COLUMNS =
  "id, name, time_of_day, items, day_of_week, position, kcal, protein_g, carbs_g, fat_g, effective_from, archived_at";

/**
 * Todas as versões de refeição do usuário, inclusive arquivadas: o histórico de
 * aderência depende de saber o que valia em cada dia. Quem filtra por data é
 * `mealsForDate` em `@/lib/diet`.
 */
export function useDietMeals(userId: string | undefined) {
  return useQuery({
    queryKey: [MEALS_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<DietMeal[]> => {
      const { data, error } = await supabase
        .from("diet_meals")
        .select(MEAL_COLUMNS)
        .eq("user_id", userId!)
        .order("effective_from", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, items: toItems(row.items) }));
    },
  });
}

export function useDietLogs(userId: string | undefined) {
  return useQuery({
    queryKey: [LOGS_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<DietMealLog[]> => {
      const { data, error } = await supabase
        .from("diet_meal_logs")
        .select("meal_id, log_date")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddDietMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DietMealInput & { position?: number }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from("diet_meals").insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEALS_KEY, userId] }),
  });
}

/**
 * Editar não sobrescreve o texto: arquiva a versão vigente a partir de hoje e
 * insere a nova. Os logs antigos continuam apontando para a versão antiga, então
 * a aderência do passado não muda de significado.
 */
export function useUpdateDietMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ meal, input }: { meal: DietMeal; input: DietMealInput }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      const today = toDateKey(new Date());
      // Editar no mesmo dia em que a versão nasceu não gera versão nova: a
      // antiga nunca valeu em dia fechado, então é UPDATE direto.
      if (meal.effective_from >= today) {
        const { error } = await supabase
          .from("diet_meals")
          .update(input)
          .eq("id", meal.id)
          .eq("user_id", userId);
        if (error) throw error;
        return;
      }
      const { error: archiveError } = await supabase
        .from("diet_meals")
        .update({ archived_at: today })
        .eq("id", meal.id)
        .eq("user_id", userId);
      if (archiveError) throw archiveError;
      const { data: created, error: insertError } = await supabase
        .from("diet_meals")
        .insert({
          ...input,
          user_id: userId,
          position: meal.position,
          effective_from: today,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      // O check de hoje foi gravado contra a versão antiga, que a partir de agora
      // não vale mais para hoje — sem mover, quem editar de noite vê o almoço que
      // já comeu voltar para desmarcado. Log de dia fechado fica onde está: é ele
      // que preserva o que o plano dizia naquele dia.
      const { error: relinkError } = await supabase
        .from("diet_meal_logs")
        .update({ meal_id: created.id })
        .eq("user_id", userId)
        .eq("meal_id", meal.id)
        .gte("log_date", today);
      if (relinkError) throw relinkError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MEALS_KEY, userId] });
      qc.invalidateQueries({ queryKey: [LOGS_KEY, userId] });
    },
  });
}

/**
 * Excluir = arquivar a partir de hoje. Refeição criada e apagada no mesmo dia
 * fica com archived_at = effective_from, o que a tira de todos os dias.
 */
export function useArchiveDietMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meal: DietMeal) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      const today = toDateKey(new Date());
      const { error } = await supabase
        .from("diet_meals")
        .update({ archived_at: meal.effective_from > today ? meal.effective_from : today })
        .eq("id", meal.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEALS_KEY, userId] }),
  });
}

export function useToggleDietLog(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mealId, date, done }: { mealId: string; date: string; done: boolean }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (done) {
        const { error } = await supabase
          .from("diet_meal_logs")
          .insert({ user_id: userId, meal_id: mealId, log_date: date });
        // 23505 = já estava marcada (dois toques rápidos), nada a fazer.
        if (error && error.code !== "23505") throw error;
        return;
      }
      const { error } = await supabase
        .from("diet_meal_logs")
        .delete()
        .eq("user_id", userId)
        .eq("meal_id", mealId)
        .eq("log_date", date);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LOGS_KEY, userId] }),
  });
}
