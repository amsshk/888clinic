import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
      { name: "description", content: "Sign in or create an 888clinic account to run AI skin scans and download your clinic report." },
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
  const { session, isStaff, loading } = useAuth();
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
            emailRedirectTo: `${window.location.origin}/admin`,
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

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(t("auth.googleFail"));
      return;
    }
    if (result.redirected) return;
  }

  async function onApple() {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(t("auth.appleFail"));
      return;
    }
    if (result.redirected) return;
  }


  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">{t("auth.eyebrow")}</p>
      <h1 className="mt-4 text-4xl leading-tight">
        {t("auth.title1")} <span className="text-gradient-gold">888clinic</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("auth.lede")}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("auth.note")}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 border border-border bg-card p-7">
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
        <Button type="button" variant="outline" className="w-full rounded-none" onClick={onGoogle}>
          {t("auth.google")}
        </Button>
        <Button type="button" variant="outline" className="w-full rounded-none bg-black text-white hover:bg-black/90 hover:text-white" onClick={onApple}>
          <svg className="mr-2 h-4 w-4 fill-current" viewBox="0 0 814 1000" aria-hidden="true">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.6-152.4-127C46.7 781.8 0 640.6 0 504.8 0 242.7 186.4 107.6 369.5 107.6c91 0 166.5 59.2 223.7 59.2 54.5 0 87.7-59.5 180.7-59.5 32.5 0 148.4 2.9 220.6 106.5 1.2 1.8 1.7 3.5 1.5 5.4-.3 2.2-1.1 4.5-2.9 6.6-1.2 1.5-3 2.8-4.5 3.7zM554.1 21.7C611.7 75.2 625.4 161.1 623.1 192c-1.6.5-3.1 1.1-4.5 1.7-3.4 1.5-6.9 2.9-10.4 4.2-30.2 11.2-64.4 18.6-100.8 18.6-9.1 0-18.2-.5-27.2-1.5-2.8-.3-5.6-.7-8.4-1.2-1.5-.3-3.1-.6-4.6-.9-2.5-.5-5.1-1.1-7.6-1.7-1.3-.3-2.6-.7-3.9-1.1-3.2-.9-6.4-2-9.6-3.1-1.7-.6-3.3-1.2-5-1.8-3.1-1.1-6.2-2.3-9.2-3.6-.5-.2-1.1-.4-1.6-.7-2.6-1.1-5.2-2.3-7.8-3.5-1.2-.6-2.4-1.1-3.6-1.7-2.1-1-4.2-2.1-6.3-3.2-.5-.3-1.1-.5-1.6-.8-2.3-1.2-4.6-2.4-6.8-3.7-1.2-.7-2.3-1.3-3.5-2-1.6-1-3.2-2-4.8-3.1-1.1-.7-2.2-1.4-3.3-2.2-1.4-1-2.8-2-4.2-3.1-1.1-.8-2.1-1.5-3.2-2.3-1.2-.9-2.4-1.8-3.6-2.7-1.1-.8-2.1-1.6-3.2-2.5-.5-.4-1.1-.8-1.6-1.2 31.6-37.8 74.5-66.4 121.8-66.4 49.7 0 89.4 28.6 110.2 28.6z" />
          </svg>
          {t("auth.apple")}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>

      </form>
    </div>
  );
}
