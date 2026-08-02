import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readQueue, replaceQueue, isNetworkError } from "@/lib/offline-queue";
import { toast } from "sonner";

/**
 * Sincroniza a fila offline de treinos: tenta no load e sempre que a conexão volta.
 * Cada item vira as linhas de workouts que teriam sido criadas na hora.
 */
export function useOfflineWorkoutSync(userId: string | undefined) {
  const qc = useQueryClient();
  const syncing = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const flush = async () => {
      if (syncing.current) return;
      const queue = readQueue();
      if (queue.length === 0) return;
      syncing.current = true;
      const remaining = [...queue];
      let synced = 0;
      try {
        while (remaining.length > 0) {
          const item = remaining[0];
          const rows = item.group_ids.map((group_id) => ({
            user_id: userId,
            group_id,
            workout_type: item.workout_types.join(", "),
            workout_date: item.workout_date,
            notes: item.notes,
            photo_url: item.photo_url,
          }));
          const { error } = await supabase.from("workouts").insert(rows);
          if (error) {
            if (isNetworkError(error)) break; // ainda offline, tenta depois
            // erro de negócio: descarta o item para não travar a fila
            console.error("Item da fila offline rejeitado:", error);
          } else {
            synced++;
          }
          remaining.shift();
        }
      } finally {
        replaceQueue(remaining);
        syncing.current = false;
      }
      if (synced > 0) {
        qc.invalidateQueries({ queryKey: ["workouts"] });
        toast.success(synced === 1 ? "Treino offline sincronizado!" : `${synced} treinos offline sincronizados!`);
      }
    };

    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [userId, qc]);
}
