import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Workout = Tables<"workouts">;

export function useGroupWorkouts(groupId: string | undefined) {
  return useQuery({
    queryKey: ["workouts", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Workout[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("group_id", groupId)
        .order("workout_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddWorkout(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      group_id: string;
      workout_type: string;
      workout_date: string;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("workouts")
        .insert({
          user_id: userId!,
          group_id: params.group_id,
          workout_type: params.workout_type,
          workout_date: params.workout_date,
          notes: params.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Workout;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts", variables.group_id] });
    },
  });
}

/** Registra um único treino com um ou mais tipos (ex.: Costas e Tríceps = 1 treino, vários exercícios). */
export function useAddWorkouts(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      group_id: string;
      workout_types: string[];
      workout_date: string;
      notes?: string | null;
    }) => {
      if (params.workout_types.length === 0) throw new Error("Selecione pelo menos um tipo.");
      const workout_type = params.workout_types.join(", ");
      const { data, error } = await supabase
        .from("workouts")
        .insert({
          user_id: userId!,
          group_id: params.group_id,
          workout_type,
          workout_date: params.workout_date,
          notes: params.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Workout;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts", variables.group_id] });
    },
  });
}

/** Exclui um treino (apenas os próprios). */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workout_id: string; group_id: string }) => {
      const { error } = await supabase.from("workouts").delete().eq("id", params.workout_id);
      if (error) throw error;
      return params.group_id;
    },
    onSuccess: (group_id) => {
      queryClient.invalidateQueries({ queryKey: ["workouts", group_id] });
    },
  });
}
