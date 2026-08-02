import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HistoryEntry } from "@/lib/personal-records";

/** Histórico completo de cargas do usuário (PRs, conquistas e gráficos). */
export function useExerciseHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ["exercise-history", userId],
    enabled: !!userId,
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("exercise_history")
        .select("exercise_title, load_kg, reps, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((d) => ({ ...d, load_kg: Number(d.load_kg) }));
    },
  });
}

export function useAddExerciseHistory(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { exercise_title: string; load_kg: number; reps: number; sets: number }) => {
      if (!userId) throw new Error("Sem usuário");
      const { error } = await supabase.from("exercise_history").insert({ ...params, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercise-history", userId] }),
  });
}
