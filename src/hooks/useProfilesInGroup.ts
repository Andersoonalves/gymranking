import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileInfo = { display_name: string; avatar_url: string | null };

/** Mapa user_id -> ProfileInfo para membros do grupo (para ranking e feed). */
export function useProfilesInGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-profiles", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Record<string, ProfileInfo>> => {
      if (!groupId) return {};
      const { data: members, error: mErr } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (mErr) throw mErr;
      const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
      if (userIds.length === 0) return {};
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      if (pErr) throw pErr;
      const map: Record<string, ProfileInfo> = {};
      for (const p of profiles ?? []) {
        map[p.user_id] = { display_name: p.display_name ?? "Sem nome", avatar_url: p.avatar_url };
      }
      return map;
    },
  });
}
