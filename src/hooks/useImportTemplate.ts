import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutTemplate } from "@/lib/workout-templates";

export function useImportTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { template: WorkoutTemplate; userId: string }) => {
      const { template, userId } = params;
      const createdPrograms: { id: string; title: string }[] = [];

      for (const day of template.days) {
        const { data: program, error: progErr } = await supabase
          .from("training_programs")
          .insert({ user_id: userId, title: day.name })
          .select()
          .single();
        if (progErr) throw progErr;

        if (day.exercises.length > 0) {
          const rows = day.exercises.map((ex, i) => ({
            program_id: program.id,
            title: ex.title,
            sets: ex.sets,
            reps: typeof ex.reps === "string" ? 0 : ex.reps,
            load_kg: ex.load_kg,
            position: i,
          }));
          const { error: exErr } = await supabase
            .from("training_exercises")
            .insert(rows);
          if (exErr) throw exErr;
        }

        createdPrograms.push({ id: program.id, title: day.name });
      }

      return createdPrograms;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_programs"] });
    },
  });
}
