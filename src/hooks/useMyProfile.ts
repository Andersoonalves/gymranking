import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncPrimaryColor } from "@/lib/theme-color";

export type MyProfile = {
  display_name: string;
  avatar_url: string | null;
  weekly_goal: number;
  primary_color: string | null;
  /** Deixa o grupo ver a dieta e a aderência. Opt-in, default false. */
  diet_shared: boolean;
};

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, weekly_goal, primary_color, diet_shared")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      // Sincroniza a cor aqui porque este hook roda em toda tela autenticada
      // (MainLayout, Início, Progresso, Configurações) — sem effect extra.
      syncPrimaryColor(data.primary_color);
      return data;
    },
  });
}

export function useUpdatePrimaryColor(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (primary_color: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ primary_color })
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    },
  });
}

export function useUpdateDietShared(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (diet_shared: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ diet_shared })
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    },
  });
}

export function useUpdateWeeklyGoal(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weekly_goal: number) => {
      const { error } = await supabase
        .from("profiles")
        .update({ weekly_goal })
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    },
  });
}
