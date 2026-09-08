import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — 888clinic" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(Boolean(session));
        setChecking(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      toast.error("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });

      await supabase.auth.signOut();
      await navigate({ to: "/auth" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your password.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-sm text-muted-foreground">
        Verifying your password reset link…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-4 text-4xl leading-tight">Reset link unavailable</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This reset link is invalid or has expired. Request a new link from
          the sign-in page.
        </p>
        <Button asChild className="mt-6 rounded-none">
          <Link to="/auth">Return to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-4 text-4xl leading-tight">
        Choose a new password
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Enter a secure password containing at least eight characters.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5 border border-border bg-card p-7"
      >
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="rounded-none"
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          size="lg"
          className="w-full rounded-none"
        >
          {busy ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
