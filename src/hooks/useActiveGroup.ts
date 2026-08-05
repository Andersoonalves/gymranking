import { useEffect, useState } from "react";
import { GROUPS_STORAGE_KEY } from "@/lib/constants";

const ACTIVE_GROUP_EVENT = "fitrank:active-group";

/**
 * Grupo ativo compartilhado entre sidebar e páginas. O valor vive no
 * localStorage (mesma chave de sempre); um evento custom sincroniza os
 * componentes da mesma aba, já que "storage" só dispara entre abas.
 */
export function useActiveGroupId() {
  const [id, setId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(GROUPS_STORAGE_KEY) : null,
  );

  useEffect(() => {
    const sync = () => setId(localStorage.getItem(GROUPS_STORAGE_KEY));
    window.addEventListener(ACTIVE_GROUP_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_GROUP_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setActiveGroupId = (next: string) => {
    localStorage.setItem(GROUPS_STORAGE_KEY, next);
    window.dispatchEvent(new Event(ACTIVE_GROUP_EVENT));
  };

  return [id, setActiveGroupId] as const;
}
