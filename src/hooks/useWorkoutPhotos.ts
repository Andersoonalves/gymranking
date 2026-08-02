import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** URLs assinadas (1h) das fotos-prova de treino, num lote só. Mapa path -> url. */
export function useWorkoutPhotoUrls(paths: string[]) {
  const key = [...paths].sort().join(",");
  return useQuery({
    queryKey: ["workout-photo-urls", key],
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from("workout-photos").createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
}
