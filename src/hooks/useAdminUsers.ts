import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  email_confirmed: boolean;
}

function getHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

function apiUrl(action: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchUsers = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const res = await fetch(apiUrl("list"), { headers: getHeaders(session.access_token) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Erro ao buscar usuários");
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (email: string, password: string, display_name: string) => {
    const res = await fetch(apiUrl("create"), {
      method: "POST",
      headers: getHeaders(session!.access_token),
      body: JSON.stringify({ email, password, display_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchUsers();
    return data;
  };

  const resetPassword = async (user_id: string, new_password: string) => {
    const res = await fetch(apiUrl("reset-password"), {
      method: "POST",
      headers: getHeaders(session!.access_token),
      body: JSON.stringify({ user_id, new_password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const deleteUser = async (user_id: string) => {
    const res = await fetch(apiUrl("delete"), {
      method: "POST",
      headers: getHeaders(session!.access_token),
      body: JSON.stringify({ user_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchUsers();
    return data;
  };

  return { users, loading, error, createUser, resetPassword, deleteUser, refetch: fetchUsers };
}
