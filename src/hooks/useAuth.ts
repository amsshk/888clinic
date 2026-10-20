import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const handleError = (cause: unknown) => {
      if (!active) return;
      const error = cause instanceof Error ? cause : new Error("Authentication unavailable");
      console.error("[auth] Could not initialize session", error);
      setError(error);
      setSession(null);
      setLoading(false);
    };

    try {
      // The lazy client can throw before a request if deployment config is missing.
      const auth = supabase.auth;
      const { data } = auth.onAuthStateChange((_event, next) => {
        if (!active) return;
        setSession(next);
        setError(null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      auth
        .getSession()
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            handleError(error);
            return;
          }
          setSession(data.session);
          setLoading(false);
        })
        .catch(handleError);
    } catch (error) {
      handleError(error);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const user: User | null = session?.user ?? null;

  useEffect(() => {
    if (!user) {
      setIsStaff(false);
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        const roles = data?.map((r) => r.role) ?? [];
        setIsAdmin(roles.includes("admin"));
        setIsStaff(roles.includes("admin") || roles.includes("staff"));
      });
    return () => {
      active = false;
    };
  }, [user]);

  return {
    session,
    user,
    isStaff,
    isAdmin,
    loading,
    error,
    signOut: () => supabase.auth.signOut(),
  };
}
