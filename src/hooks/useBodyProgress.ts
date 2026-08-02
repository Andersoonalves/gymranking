import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BodyProgress = {
    id: string;
    user_id: string;
    weight_kg: number;
    photo_url: string | null;
    notes: string | null;
    recorded_at: string;
    created_at: string;
};

const bodyProgressTable = () => supabase.from("body_progress");

const QUERY_KEY = "body_progress";

export function useBodyProgress(userId: string | undefined) {
    return useQuery({
        queryKey: [QUERY_KEY, userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await bodyProgressTable()
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
            const { data, error } = await bodyProgressTable()
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
            const { error } = await bodyProgressTable()
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
