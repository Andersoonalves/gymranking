import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Workout = Tables<"workouts">;

/**
 * Treinos que contam para um grupo: os dos membros dele. O treino em si não
 * pertence a grupo nenhum, então o mesmo histórico aparece em todos os grupos
 * da pessoa. `group_workouts` resolve isso em uma ida ao banco (SECURITY
 * INVOKER — a RLS continua valendo).
 */
export function useGroupWorkouts(groupId: string | undefined) {
  return useQuery({
    queryKey: ["workouts", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Workout[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase.rpc("group_workouts", { _group_id: groupId });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddWorkout(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workout_types: string[];
      workout_date: string;
      notes?: string | null;
      photo_url?: string | null;
    }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (params.workout_types.length === 0) throw new Error("Selecione pelo menos um tipo.");
      const { data, error } = await supabase
        .from("workouts")
        .insert({
          user_id: userId,
          workout_type: params.workout_types.join(", "),
          workout_date: params.workout_date,
          notes: params.notes ?? null,
          photo_url: params.photo_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Workout;
    },
    // O treino entra no placar de todos os grupos: invalida a chave inteira.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workout_id: string }) => {
      const { data: workout, error: fetchError } = await supabase
        .from("workouts")
        .select("photo_url")
        .eq("id", params.workout_id)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase.from("workouts").delete().eq("id", params.workout_id);
      if (error) throw error;

      if (workout.photo_url) {
        await supabase.storage.from("workout-photos").remove([workout.photo_url]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}
