import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { formatThb } from "@/lib/skincare-catalog";

type OrderItem = {
  product_name: string;
  quantity: number;
  unit_amount_thb: number;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  fulfilment: string;
  amount_thb: number;
  email: string | null;
  phone: string | null;
  shipping_name: string | null;
  shipping_address: { formatted?: string } | null;
  order_items: OrderItem[];
};

const NEXT_STATUS: Record<string, { label: string; value: string }> = {
  paid: { label: "Mark as packed", value: "packed" },
  packed: { label: "Mark as sent / collected", value: "fulfilled" },
};

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, status, fulfilment, amount_thb, email, phone, shipping_name, shipping_address, order_items(product_name, quantity, unit_amount_thb)",
      )
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load orders");
    setOrders((data as Order[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: next.value })
      .eq("id", order.id);
    if (error) {
      toast.error("Could not update this order");
      return;
    }
    toast.success(`Order marked ${next.value}`);
    void load();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  if (!orders.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No skincare orders yet. They appear here the moment a payment clears.
      </p>
    );
  }

  return (
    <div className="space-y-px bg-border">
      {orders.map((order) => {
        const next = NEXT_STATUS[order.status];
        return (
          <div key={order.id} className="bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-none uppercase tracking-widest">
                    {order.status}
                  </Badge>
                  <Badge variant="secondary" className="rounded-none uppercase tracking-widest">
                    {order.fulfilment === "pickup" ? "Clinic pickup" : "Delivery"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {order.shipping_name || order.email || "Patient"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[order.email, order.phone].filter(Boolean).join(" · ")}
                </p>
                {order.fulfilment === "delivery" && order.shipping_address?.formatted ? (
                  <p className="mt-2 max-w-md text-xs text-muted-foreground">
                    {order.shipping_address.formatted}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1 text-sm">
                  {order.order_items?.map((item, index) => (
                    <li key={index}>
                      {item.product_name} × {item.quantity} —{" "}
                      {formatThb(item.unit_amount_thb * item.quantity)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl">{formatThb(order.amount_thb)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                {next ? (
                  <Button
                    size="sm"
                    className="mt-3 rounded-none"
                    onClick={() => void advance(order)}
                  >
                    {next.label}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
