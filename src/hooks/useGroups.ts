import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GroupWithMembership = Tables<"groups"> & {
  role: string;
  joined_at: string;
};

export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-groups", userId],
    enabled: !!userId,
    queryFn: async (): Promise<GroupWithMembership[]> => {
      if (!userId) return [];
      const { data: memberships, error: memError } = await supabase
        .from("group_members")
        .select("group_id, role, joined_at")
        .eq("user_id", userId);
      if (memError) throw memError;
      if (!memberships?.length) return [];
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", memberships.map((m) => m.group_id));
      if (groupsError) throw groupsError;
      return (groups || []).map((g) => {
        const m = memberships.find((x) => x.group_id === g.id)!;
        return { ...g, role: m.role, joined_at: m.joined_at };
      });
    },
  });
}

export function useCreateGroup(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Grupo não criado");
      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: userId!,
        role: "admin",
      });
      if (memberError) throw memberError;
      return data;
    },
    onSuccess: (data) => {
      if (!data || !userId) return;
      const newGroup: GroupWithMembership = {
        ...data,
        role: "admin",
        joined_at: new Date().toISOString(),
      };
      queryClient.setQueryData<GroupWithMembership[]>(
        ["my-groups", userId],
        (old) => (old ? [...old, newGroup] : [newGroup])
      );
      queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    },
  });
}

export function useLeaveGroup(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    },
  });
}

export function useJoinGroupByCode(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const code = inviteCode.trim().toUpperCase();
      if (!userId) throw new Error("Usuário não autenticado.");
      const { data: groups, error: joinError } = await supabase
        .rpc("join_group_by_invite_code", { _code: code });
      if (joinError) {
        if (joinError.code === "23505") throw new Error("Você já está neste grupo.");
        throw joinError;
      }
      const group = groups?.[0];
      if (!group) throw new Error("Código inválido. Verifique e tente novamente.");
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    },
  });
}
