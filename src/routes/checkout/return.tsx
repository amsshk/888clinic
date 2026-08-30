import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getStripeEnvironment } from "@/lib/stripe";
import { getCheckoutSession } from "@/lib/payments.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Payment Complete — 888clinic" },
      {
        name: "description",
        content: "Confirm your 888clinic scan credit purchase and return to the AI skin scanner.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Payment Complete — 888clinic" },
      { property: "og:description", content: "Confirm your 888clinic scan credit purchase." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => {
    const sessionId = search['session_id'];
    return {
      session_id: typeof sessionId === 'string' ? sessionId : undefined,
    };
  },
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { t } = useLang();
  const { session_id: sessionId } = useSearch({ from: "/checkout/return" });
  const fetchSession = useServerFn(getCheckoutSession);

  const { data, isLoading } = useQuery({
    queryKey: ["checkout-session", sessionId],
    queryFn: () =>
      fetchSession({
        data: { sessionId: sessionId ?? "", environment: getStripeEnvironment() },
      }),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (sessionId && "session" in (data ?? {}) && (data as any)?.session?.status === "complete") {
      window.location.href = "/skin-ai?checkout=success";
    }
  }, [data, sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <XCircle className="mx-auto size-12 text-red-500" />
        <h1 className="mt-6 text-2xl">{t("payment.missing")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("payment.missingBody")}</p>
        <Button asChild className="mt-6 rounded-none">
          <a href="/mali?tool=scan">{t("payment.back")}</a>
        </Button>
      </div>
    );
  }

  if (isLoading || !data || "error" in data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">{t("payment.checking")}</p>
      </div>
    );
  }

  const session = (data as any).session;
  if (session?.status === "complete") {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <CheckCircle className="mx-auto size-12 text-emerald-500" />
        <h1 className="mt-6 text-2xl">{t("payment.success")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("payment.successBody")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <XCircle className="mx-auto size-12 text-red-500" />
      <h1 className="mt-6 text-2xl">{t("payment.failed")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("payment.failedBody")}</p>
      <Button asChild className="mt-6 rounded-none">
        <a href="/mali?tool=scan">{t("payment.back")}</a>
      </Button>
    </div>
  );
}
