import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment } from "@/lib/stripe";
import { formatThb } from "@/lib/skincare-catalog";
import { createPortalSession } from "@/lib/payments.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My Orders & Refills — 888clinic" },
      {
        name: "description",
        content:
          "Track your 888clinic skincare orders, see delivery or pickup details, and manage your monthly refill plan.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My Orders & Refills — 888clinic" },
      {
        property: "og:description",
        content: "Track skincare orders and manage monthly refills at 888clinic.",
      },
    ],
  }),
  component: OrdersPage,
});

type OrderItem = { product_name: string; quantity: number; unit_amount_thb: number };

type Order = {
  id: string;
  created_at: string;
  status: string;
  fulfilment: string;
  amount_thb: number;
  shipping_address: { formatted?: string } | null;
  order_items: OrderItem[];
};

type Refill = {
  id: string;
  product_name: string | null;
  quantity: number;
  amount_thb: number;
  status: string;
  fulfilment: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const STATUS_KEY = {
  paid: "or.status.paid",
  packed: "or.status.packed",
  fulfilled: "or.status.fulfilled",
  refunded: "or.status.refunded",
} as const;

function OrdersPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const env = getStripeEnvironment();
    void (async () => {
      const [ordersRes, refillsRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, created_at, status, fulfilment, amount_thb, shipping_address, order_items(product_name, quantity, unit_amount_thb)",
          )
          .eq("user_id", user.id)
          .eq("environment", env)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_subscriptions")
          .select(
            "id, product_name, quantity, amount_thb, status, fulfilment, current_period_end, cancel_at_period_end",
          )
          .eq("user_id", user.id)
          .eq("environment", env)
          .order("created_at", { ascending: false }),
      ]);
      setOrders((ordersRes.data as Order[] | null) ?? []);
      setRefills((refillsRes.data as Refill[] | null) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const manageRefills = async () => {
    setOpeningPortal(true);
    try {
      const result = await createPortalSession({
        data: {
          returnUrl: `${window.location.origin}/orders`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("or.portalErr"));
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <p className="eyebrow">{t("or.eyebrow")}</p>
      <h1 className="mt-3 text-4xl leading-tight">
        {t("or.title")} <span className="text-gradient-gold">{t("or.title2")}</span>
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {t("or.lede")}
      </p>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-gold" />
        </div>
      ) : (
        <>
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl">
                <RefreshCw className="size-4 text-gold" /> {t("or.refills")}
              </h2>
              {refills.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  disabled={openingPortal}
                  onClick={() => void manageRefills()}
                >
                  {openingPortal ? t("or.opening") : t("or.manage")}
                </Button>
              ) : null}
            </div>
            {refills.length ? (
              <div className="mt-4 space-y-px bg-border">
                {refills.map((refill) => (
                  <div
                    key={refill.id}
                    className="flex flex-wrap items-center justify-between gap-4 bg-card p-5"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {refill.product_name ?? t("or.refillName")} × {refill.quantity}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {refill.cancel_at_period_end
                          ? t("or.ends")
                          : refill.status === "active"
                            ? t("or.next")
                            : t("or.periodEnds")}{" "}
                        {refill.current_period_end
                          ? new Date(refill.current_period_end).toLocaleDateString()
                          : "—"}{" "}
                        · {refill.fulfilment === "pickup" ? t("or.pickup") : t("or.delivery")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl">{formatThb(refill.amount_thb)}</p>
                      <Badge variant="outline" className="mt-1 rounded-none uppercase tracking-widest">
                        {refill.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("or.noRefills")}
              </p>
            )}
          </section>

          <section className="mt-14">
            <h2 className="flex items-center gap-2 text-xl">
              <Package className="size-4 text-gold" /> {t("or.history")}
            </h2>
            {orders.length ? (
              <div className="mt-4 space-y-px bg-border">
                {orders.map((order) => (
                  <div key={order.id} className="bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Badge variant="secondary" className="rounded-none uppercase tracking-widest">
                          {order.status in STATUS_KEY
                            ? t(STATUS_KEY[order.status as keyof typeof STATUS_KEY])
                            : order.status}
                        </Badge>
                        <ul className="mt-3 space-y-1 text-sm">
                          {order.order_items?.map((item, index) => (
                            <li key={index}>
                              {item.product_name} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {order.fulfilment === "pickup"
                            ? t("or.collect")
                            : (order.shipping_address?.formatted ?? t("or.deliverTh"))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl">{formatThb(order.amount_thb)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("or.noOrders")}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
