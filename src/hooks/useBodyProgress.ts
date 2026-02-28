import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type BodyProgress = Tables<"body_progress">;

const QUERY_KEY = "body_progress";

export function useBodyProgress(userId: string | undefined) {
    return useQuery({
        queryKey: [QUERY_KEY, userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from("body_progress")
                .select("*")
                .eq("user_id", userId)
                .order("recorded_at", { ascending: true });
            if (error) throw error;
            return data as BodyProgress[];
        },
    });
}

export function useAddBodyProgress(userId: string | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            weight_kg: number;
            photo_url?: string | null;
            notes?: string | null;
            recorded_at: string;
        }) => {
            if (!userId) throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("body_progress")
                .insert({ ...payload, user_id: userId })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
        },
    });
}

export function useDeleteBodyProgress(userId: string | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("body_progress")
                .delete()
                .eq("id", id)
                .eq("user_id", userId!);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
        },
    });
}
