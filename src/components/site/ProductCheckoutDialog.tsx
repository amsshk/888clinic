import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Link } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createProductCheckout } from "@/lib/payments.functions";
import { formatThb, type SkincareProduct } from "@/lib/skincare-catalog";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

type Plan = "once" | "refill";
type Fulfilment = "delivery" | "pickup";

type Props = {
  product: SkincareProduct | null;
  onClose: () => void;
};

export function ProductCheckoutDialog({ product, onClose }: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("once");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [quantity, setQuantity] = useState(1);
  const [paying, setPaying] = useState(false);

  const open = !!product;
  const unit = product ? (plan === "refill" ? product.refillThb : product.priceThb) : 0;

  const reset = () => {
    setPlan("once");
    setFulfilment("delivery");
    setQuantity(1);
    setPaying(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchClientSecret = async (): Promise<string> => {
    if (!product) throw new Error("No product selected");
    const result = await createProductCheckout({
      data: {
        priceId: plan === "refill" ? product.refillPriceId : product.oncePriceId,
        quantity,
        fulfilment,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Payment could not be started");
    return result.clientSecret;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={paying ? "max-w-3xl p-0" : "max-w-lg rounded-none"}>
        {paying ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{t("checkout.title")}</DialogTitle>
            </DialogHeader>
            <div className="min-h-[600px] w-full">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">
                {product?.name}
              </DialogTitle>
              <DialogDescription>
                {product?.size} · {product?.note}
              </DialogDescription>
            </DialogHeader>

            {!user ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("checkout.signin")}
                </p>
                <Button asChild className="w-full rounded-none">
                  <Link to="/auth">{t("cta.signin")}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="eyebrow">{t("checkout.frequency")}</p>
                  <div className="mt-3 grid gap-px bg-border sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPlan("once")}
                      className={`bg-card p-4 text-left transition-colors ${plan === "once" ? "ring-1 ring-gold" : "hover:bg-secondary/60"}`}
                    >
                      <p className="text-sm font-semibold">{t("checkout.once")}</p>
                      <p className="mt-1 font-display text-xl">
                        {product ? formatThb(product.priceThb) : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlan("refill")}
                      className={`bg-card p-4 text-left transition-colors ${plan === "refill" ? "ring-1 ring-gold" : "hover:bg-secondary/60"}`}
                    >
                      <p className="text-sm font-semibold">{t("checkout.monthly")}</p>
                      <p className="mt-1 font-display text-xl">
                        {product ? formatThb(product.refillThb) : ""}
                        <span className="text-xs text-muted-foreground"> {t("checkout.perMonth")}</span>
                      </p>
                    </button>
                  </div>
                  {plan === "refill" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("checkout.refillNote")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="eyebrow">{t("checkout.receive")}</p>
                  <div className="mt-3 grid gap-px bg-border sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFulfilment("delivery")}
                      className={`bg-card p-4 text-left transition-colors ${fulfilment === "delivery" ? "ring-1 ring-gold" : "hover:bg-secondary/60"}`}
                    >
                      <p className="text-sm font-semibold">{t("checkout.delivery")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("checkout.deliveryNote")}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfilment("pickup")}
                      className={`bg-card p-4 text-left transition-colors ${fulfilment === "pickup" ? "ring-1 ring-gold" : "hover:bg-secondary/60"}`}
                    >
                      <p className="text-sm font-semibold">{t("checkout.pickup")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("checkout.pickupNote")}
                      </p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-5">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-none"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label={t("checkout.decrease")}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center text-sm">{quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-none"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      aria-label={t("checkout.increase")}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="font-display text-2xl">{formatThb(unit * quantity)}</p>
                </div>

                <Button className="w-full rounded-none" onClick={() => setPaying(true)}>
                  {t("checkout.continue")}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
