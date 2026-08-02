import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Challenge = Tables<"challenges"> & {
  challenge_participants: { user_id: string }[];
};

export function useChallenges(groupId: string | undefined) {
  return useQuery({
    queryKey: ["challenges", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Challenge[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("challenges")
        .select("*, challenge_participants(user_id)")
        .eq("group_id", groupId)
        .order("ends_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
  });
}

export function useCreateChallenge(groupId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; emoji: string; target: number | null; starts_at: string; ends_at: string }) => {
      if (!groupId || !userId) throw new Error("Sem grupo ou usuário");
      const { data, error } = await supabase
        .from("challenges")
        .insert({ ...params, group_id: groupId, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      // quem cria já entra
      const { error: joinError } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: data.id, user_id: userId });
      if (joinError) throw joinError;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useJoinChallenge(groupId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!userId) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useLeaveChallenge(groupId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!userId) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useDeleteChallenge(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.from("challenges").delete().eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}
