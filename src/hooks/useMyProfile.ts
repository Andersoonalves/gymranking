import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MyProfile = {
  display_name: string;
  avatar_url: string | null;
  weekly_goal: number;
};

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, weekly_goal")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
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
