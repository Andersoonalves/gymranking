import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrainingExercise {
  id: string;
  program_id: string;
  title: string;
  sets: number;
  load_kg: number;
  reps: number;
  position: number;
  video_url: string | null;
  notes: string | null;
}

export interface TrainingProgram {
  id: string;
  user_id: string;
  group_id: string;
  title: string;
  created_at: string;
  training_exercises?: TrainingExercise[];
}

export function useTrainingPrograms(groupId: string | undefined) {
  return useQuery({
    queryKey: ["training_programs", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<TrainingProgram[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("training_programs")
        .select("*, training_exercises(*)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingProgram[];
    },
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user_id: string; group_id: string; title: string }) => {
      const { data, error } = await supabase
        .from("training_programs")
        .insert({ user_id: params.user_id, group_id: params.group_id, title: params.title })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TrainingProgram;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["training_programs", d.group_id] }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; group_id: string }) => {
      const { error } = await supabase.from("training_programs").delete().eq("id", params.id);
      if (error) throw error;
      return params.group_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ["training_programs", gid] }),
  });
}

export function useAddExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { program_id: string; group_id: string; title: string; sets: number; load_kg: number; reps: number; position: number }) => {
      const { data, error } = await supabase
        .from("training_exercises")
        .insert({ program_id: params.program_id, title: params.title, sets: params.sets, load_kg: params.load_kg, reps: params.reps, position: params.position })
        .select()
        .single();
      if (error) throw error;
      return { ...data, group_id: params.group_id };
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["training_programs", d.group_id] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      group_id: string;
      sets?: number;
      reps?: number;
      load_kg?: number;
      video_url?: string | null;
      notes?: string | null;
      title?: string;
    }) => {
      const { id, group_id, ...fields } = params;
      const { error } = await supabase.from("training_exercises").update(fields).eq("id", id);
      if (error) throw error;
      return group_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ["training_programs", gid] }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; group_id: string }) => {
      const { error } = await supabase.from("training_exercises").delete().eq("id", params.id);
      if (error) throw error;
      return params.group_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ["training_programs", gid] }),
  });
}
