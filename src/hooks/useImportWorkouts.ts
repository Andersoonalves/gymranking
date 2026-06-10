import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ImportWorkout {
  date: string;
  time: string;
  workout_type: string;
  notes: string | null;
}

interface ImportData {
  workouts: ImportWorkout[];
}

export function useImportWorkouts(userId: string | undefined, groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId || !groupId) throw new Error("Usuário ou grupo não selecionado.");

      const text = await file.text();
      let data: ImportData;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Arquivo JSON inválido.");
      }

      if (!data.workouts || !Array.isArray(data.workouts)) {
        throw new Error("Formato inválido: array 'workouts' não encontrado.");
      }

      const rows = data.workouts.map((w) => {
        const workoutDate = `${w.date}T${w.time || "12:00"}:00`;
        return {
          user_id: userId,
          group_id: groupId,
          workout_type: w.workout_type,
          workout_date: new Date(workoutDate).toISOString(),
          notes: w.notes || null,
        };
      });

      const { error } = await supabase.from("workouts").insert(rows);
      if (error) throw error;

      return rows.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}
