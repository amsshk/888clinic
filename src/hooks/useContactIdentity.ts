import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ContactIdentity = {
  loading: boolean;
  signedIn: boolean;
  fullName: string;
  email: string;
  phone: string;
  /** Persist the phone number on the profile so it is remembered next time. */
  rememberPhone: (phone: string) => Promise<void>;
};

/**
 * Resolves the signed-in patient's contact details so booking forms only need
 * the phone number instead of asking for name and email again.
 */
export function useContactIdentity(): ContactIdentity {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const metaName =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    (user?.user_metadata?.["name"] as string | undefined) ??
    "";
  const metaPhone = (user?.user_metadata?.["phone"] as string | undefined) ?? "";

  return {
    loading: authLoading || loading,
    signedIn: Boolean(user),
    fullName: profile?.full_name?.trim() || metaName || "",
    email: user?.email ?? "",
    phone: profile?.phone?.trim() || metaPhone || "",
    rememberPhone: async (phone: string) => {
      if (!user || !phone.trim()) return;
      await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", user.id);
    },
  };
}
