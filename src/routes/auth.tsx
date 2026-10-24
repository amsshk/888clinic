import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { checkSignupAllowed } from "@/lib/signup-guard.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — 888clinic" },
      {
        name: "description",
        content:
          "Sign in or create an 888clinic account to run AI skin scans and download your clinic report.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff Sign In — 888clinic" },
      { property: "og:description", content: "Secure sign in for 888clinic clinic staff." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { session, isStaff, loading, error: authError } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const verifySignup = useServerFn(checkSignupAllowed);

  useEffect(() => {
    if (loading || !session) return;
    navigate(isStaff ? { to: "/admin" } : { to: "/mali", search: { tool: "scan" as const } });
  }, [session, isStaff, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcome"));
      } else {
        const guard = await verifySignup({ data: { email } });
        if (!guard.allowed) {
          toast.error(t("auth.blocked"), { description: guard.reason });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success(t("auth.created"), { description: t("auth.createdBody") });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Enter your email address first.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Check your email", {
        description:
          "If an account exists for this address, Supabase will send a password reset link.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send the password reset email.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    // Google sign-in through the clinic's own Supabase project
    // (Supabase dashboard → Authentication → Providers → Google).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(t("auth.googleFail"));
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">{t("auth.eyebrow")}</p>
      <h1 className="mt-4 text-4xl leading-tight">
        {t("auth.title1")} <span className="text-gradient-gold">888clinic</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t("auth.lede")}</p>
      <p className="mt-3 text-xs text-muted-foreground">{t("auth.note")}</p>

      {authError && (
        <div role="alert" className="mt-6 border border-border bg-card p-4 text-sm">
          <p>{t("auth.unavailable")}</p>
          <button
            type="button"
            className="mt-3 underline underline-offset-4"
            onClick={() => window.location.reload()}
          >
            {t("auth.retry")}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 border border-border bg-card p-7">
        <fieldset
          disabled={busy || loading || !!authError}
          className="min-w-0 space-y-5 disabled:opacity-60"
        >
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("auth.name")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-none"
                maxLength={100}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-none"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-none"
            />
          </div>
          <Button type="submit" disabled={busy} size="lg" className="w-full rounded-none">
            {mode === "signin" ? t("auth.signin") : t("auth.create")}
          </Button>
          {mode === "signin" && (
            <button
              type="button"
              disabled={busy}
              onClick={onForgotPassword}
              className="block w-full text-right text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-none"
            onClick={onGoogle}
          >
            {t("auth.google")}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
