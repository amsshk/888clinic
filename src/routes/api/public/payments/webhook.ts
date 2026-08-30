import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { createStripeClient, getStripeErrorMessage, verifyWebhook } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type StripeEnvParam = "sandbox" | "live";

const thb = (cents: number) => Math.round(cents / 100);
const formatThb = (baht: number) => `฿${baht.toLocaleString("en-US")}`;

function formatAddress(details: Stripe.Checkout.Session["customer_details"] | null | undefined) {
  const a = details?.address;
  if (!a) return null;
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
}

async function notifyOrder(payload: {
  email: string | null | undefined;
  name: string | null | undefined;
  phone: string | null | undefined;
  items: string;
  total: string;
  fulfilment: string;
  address: string | null;
  recurring: string | null;
  idempotencySuffix: string;
}) {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const data = {
      name: payload.name ?? "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      items: payload.items,
      total: payload.total,
      fulfilment: payload.fulfilment,
      address: payload.address ?? "",
      recurring: payload.recurring ?? "",
    };

    if (payload.email) {
      await sendTemplateEmail("order-confirmation", payload.email, {
        templateData: data,
        idempotencyKey: `order-confirmation-${payload.idempotencySuffix}`,
      });
    }
    const clinicInbox = process.env["CLINIC_INBOX_EMAIL"];
    if (clinicInbox) {
      await sendTemplateEmail("order-notification", clinicInbox, {
        templateData: data,
        idempotencyKey: `order-notification-${payload.idempotencySuffix}`,
      });
    }
  } catch (error) {
    console.error("[payments] order email failed", error);
  }
}

async function handleProductOrder(
  stripe: Stripe,
  env: StripeEnvParam,
  session: Stripe.Checkout.Session,
  userId: string,
) {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 20,
    expand: ["data.price.product"],
  });

  const items = lineItems.data.map((item) => {
    const product = item.price?.product;
    const productName =
      product && typeof product !== "string" && "name" in product
        ? product.name
        : item.description || "Skincare product";
    return {
      price_id: item.price?.lookup_key ?? null,
      product_name: productName,
      quantity: item.quantity ?? 1,
      unit_amount_thb: thb(item.price?.unit_amount ?? 0),
      recurring: item.price?.type === "recurring",
    };
  });

  const fulfilment = session.metadata?.["fulfilment"] === "pickup" ? "pickup" : "delivery";
  const address = fulfilment === "delivery" ? formatAddress(session.customer_details) : null;
  const amountThb = thb(session.amount_total ?? 0);

  const { error } = await supabaseAdmin.rpc("fulfill_product_order", {
    _user_id: userId,
    _provider_ref: `stripe:${session.id}`,
    _environment: env,
    _email: session.customer_details?.email ?? null,
    _phone: session.customer_details?.phone ?? null,
    _fulfilment: fulfilment,
    _amount_thb: amountThb,
    _shipping_name: session.customer_details?.name ?? null,
    _shipping_address: address ? { formatted: address } : null,
    _stripe_customer_id:
      typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
    _items: items.map(({ recurring: _recurring, ...rest }) => rest),
  } as never);

  if (error) {
    console.error("[payments] fulfill_product_order failed", error);
    return false;
  }

  const isRefill = items.some((i) => i.recurring);
  await notifyOrder({
    email: session.customer_details?.email,
    name: session.customer_details?.name,
    phone: session.customer_details?.phone,
    items: items.map((i) => `${i.product_name} × ${i.quantity}`).join(", "),
    total: formatThb(amountThb),
    fulfilment: fulfilment === "pickup" ? "Pick up at 888clinic" : "Delivery in Thailand",
    address,
    recurring: isRefill ? "Monthly refill — renews automatically until cancelled" : null,
    idempotencySuffix: session.id,
  });

  return true;
}

async function syncSubscription(
  stripe: Stripe,
  env: StripeEnvParam,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.["userId"];
  if (!userId) return;

  const item = subscription.items.data[0];
  const price = item?.price;
  let productName: string | null = null;
  if (price?.product) {
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    try {
      const product = await stripe.products.retrieve(productId);
      productName = product.name;
    } catch {
      productName = null;
    }
  }

  const periodEnd =
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const { error } = await supabaseAdmin.rpc("upsert_product_subscription", {
    _user_id: userId,
    _stripe_subscription_id: subscription.id,
    _environment: env,
    _stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    _price_id: price?.lookup_key ?? null,
    _product_name: productName,
    _quantity: item?.quantity ?? 1,
    _amount_thb: thb(price?.unit_amount ?? 0),
    _status: subscription.status,
    _fulfilment: subscription.metadata?.["fulfilment"] === "pickup" ? "pickup" : "delivery",
    _current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    _cancel_at_period_end: subscription.cancel_at_period_end,
  } as never);

  if (error) console.error("[payments] upsert_product_subscription failed", error);
}

async function handleRefillRenewal(env: StripeEnvParam, invoice: Stripe.Invoice) {
  const lines = invoice.lines?.data ?? [];
  const userId =
    (invoice.metadata?.["userId"] as string | undefined) ??
    (lines[0]?.metadata?.["userId"] as string | undefined);
  if (!userId) return;

  const items = lines.map((line) => ({
    price_id:
      typeof line.pricing?.price_details?.price === "string"
        ? line.pricing.price_details.price
        : null,
    product_name: line.description || "Skincare refill",
    quantity: line.quantity ?? 1,
    unit_amount_thb: thb(line.amount ?? 0),
  }));
  const amountThb = thb(invoice.amount_paid ?? 0);

  const { error } = await supabaseAdmin.rpc("fulfill_product_order", {
    _user_id: userId,
    _provider_ref: `stripe:${invoice.id}`,
    _environment: env,
    _email: invoice.customer_email ?? null,
    _phone: null,
    _fulfilment: "delivery",
    _amount_thb: amountThb,
    _shipping_name: invoice.customer_name ?? null,
    _shipping_address: null,
    _stripe_customer_id:
      typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null),
    _items: items,
  } as never);
  if (error) {
    console.error("[payments] refill renewal order failed", error);
    return;
  }

  await notifyOrder({
    email: invoice.customer_email,
    name: invoice.customer_name,
    phone: null,
    items: items.map((i) => `${i.product_name} × ${i.quantity}`).join(", "),
    total: formatThb(amountThb),
    fulfilment: "Delivery in Thailand",
    address: null,
    recurring: "Monthly refill renewal",
    idempotencySuffix: invoice.id ?? `invoice-${Date.now()}`,
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const envParam = new URL(request.url).searchParams.get("env");
          if (envParam !== "sandbox" && envParam !== "live") {
            return new Response("Invalid environment", { status: 400 });
          }
          const env: StripeEnvParam = envParam;
          const stripe = createStripeClient(env);
          const event = await verifyWebhook(request, env);

          if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            if (session.status !== "complete") {
              return new Response("Session not complete", { status: 200 });
            }

            const userId = session.metadata?.["userId"];
            if (!userId) {
              return new Response("Missing userId in session metadata", { status: 200 });
            }

            if (session.metadata?.["kind"] === "product_order") {
              const ok = await handleProductOrder(stripe, env, session, userId);
              return new Response(ok ? "ok" : "Fulfillment failed", { status: ok ? 200 : 500 });
            }

            // Scan credit packs
            const amountThb = session.amount_total ?? 0;
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              limit: 10,
            });
            const packKeys = lineItems.data
              .map((item) => item.price?.lookup_key)
              .filter((key): key is string => Boolean(key));
            const { data: packRows } = await supabaseAdmin
              .from("catalog_items")
              .select("once_price_id, credits")
              .eq("kind", "scan_pack")
              .in("once_price_id", packKeys.length > 0 ? packKeys : ["__none__"]);
            const creditsByKey = new Map(
              (packRows ?? []).map((row) => [row.once_price_id as string, row.credits ?? 0]),
            );

            let credits = 0;
            for (const item of lineItems.data) {
              const quantity = item.quantity || 1;
              const key = item.price?.lookup_key;
              if (!key) continue;
              const perPack = creditsByKey.get(key) ?? (key.startsWith("scan_pack_") ? 3 : 0);
              credits += perPack * quantity;
            }
            if (credits <= 0) credits = 3;

            const { error } = await supabaseAdmin.rpc("fulfill_credit_purchase", {
              _user_id: userId,
              _credits: credits,
              _amount_thb: amountThb,
              _provider_ref: `stripe:${session.id}`,
              _provider: "stripe",
            });

            if (error) {
              console.error("fulfill_credit_purchase error:", error);
              return new Response("Fulfillment failed", { status: 500 });
            }
          }

          if (
            event.type === "customer.subscription.created" ||
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
          ) {
            await syncSubscription(stripe, env, event.data.object);
          }

          if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object;
            if (invoice.billing_reason === "subscription_cycle") {
              await handleRefillRenewal(env, invoice);
            }
          }

          return new Response("ok", { status: 200 });
        } catch (error) {
          console.error("webhook error:", error);
          return new Response(getStripeErrorMessage(error), { status: 400 });
        }
      },
    },
  },
});
