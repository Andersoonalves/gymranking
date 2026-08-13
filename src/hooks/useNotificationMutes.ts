import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationMute = { group_id: string; muted_user_id: string | null };

/** Mutes do usuário: grupo inteiro (muted_user_id null) ou membro específico. */
export function useNotificationMutes(userId: string | undefined) {
  return useQuery({
    queryKey: ["notification-mutes", userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationMute[]> => {
      const { data, error } = await supabase
        .from("notification_mutes")
        .select("group_id, muted_user_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleNotificationMute(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      mutedUserId,
      muted,
    }: {
      groupId: string;
      mutedUserId?: string | null;
      muted: boolean;
    }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (muted) {
        const { error } = await supabase.from("notification_mutes").insert({
          user_id: userId,
          group_id: groupId,
          muted_user_id: mutedUserId ?? null,
        });
        // 23505 = já estava silenciado, nada a fazer.
        if (error && error.code !== "23505") throw error;
        return;
      }
      let query = supabase
        .from("notification_mutes")
        .delete()
        .eq("user_id", userId)
        .eq("group_id", groupId);
      query = mutedUserId ? query.eq("muted_user_id", mutedUserId) : query.is("muted_user_id", null);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-mutes", userId] });
    },
  });
}
