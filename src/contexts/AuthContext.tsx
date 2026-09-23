import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_INVITE_CODE_KEY } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, pendingInviteCode?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (pendingInviteCode?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Auto-join pending group on first login. No OAuth o código não cabe no
      // metadata (a conta nasce no provedor), então vem do localStorage.
      if (session?.user) {
        const storedInviteCode = localStorage.getItem(PENDING_INVITE_CODE_KEY);
        const pendingInviteCode = session.user.user_metadata?.pending_invite_code ?? storedInviteCode;
        if (pendingInviteCode) {
          try {
            await supabase.rpc("join_group_by_invite_code", { _code: pendingInviteCode });
          } catch {
            // Ignore duplicate or error
          }
          localStorage.removeItem(PENDING_INVITE_CODE_KEY);
          // Clear the pending_invite_code from metadata
          if (session.user.user_metadata?.pending_invite_code) {
            await supabase.auth.updateUser({
              data: { pending_invite_code: null },
            });
          }
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, pendingInviteCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, pending_invite_code: pendingInviteCode },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async (pendingInviteCode?: string) => {
    // O redirect do OAuth recarrega a página: o código de convite só sobrevive
    // fora do estado do React.
    if (pendingInviteCode) {
      localStorage.setItem(PENDING_INVITE_CODE_KEY, pendingInviteCode);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      localStorage.removeItem(PENDING_INVITE_CODE_KEY);
    }
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(PENDING_INVITE_CODE_KEY);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
