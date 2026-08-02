import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LikeSummary = { count: number; likedByMe: boolean };

/** Mapa workout_id -> curtidas (⚡) dos treinos do grupo. */
export function useWorkoutLikes(groupId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["workout-likes", groupId],
    enabled: !!groupId && !!userId,
    queryFn: async (): Promise<Record<string, LikeSummary>> => {
      if (!groupId) return {};
      const { data, error } = await supabase
        .from("workout_likes")
        .select("workout_id, user_id, workouts!inner(group_id)")
        .eq("workouts.group_id", groupId);
      if (error) throw error;
      const map: Record<string, LikeSummary> = {};
      for (const like of data ?? []) {
        const entry = (map[like.workout_id] ??= { count: 0, likedByMe: false });
        entry.count++;
        if (like.user_id === userId) entry.likedByMe = true;
      }
      return map;
    },
  });
}

export function useToggleWorkoutLike(groupId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workout_id: string; liked: boolean }) => {
      if (!userId) throw new Error("Sem usuário");
      if (params.liked) {
        const { error } = await supabase
          .from("workout_likes")
          .delete()
          .eq("workout_id", params.workout_id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_likes")
          .insert({ workout_id: params.workout_id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-likes", groupId] });
    },
  });
}
