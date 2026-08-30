import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Keeps a Stripe price in sync with the clinic-managed amount by minting a new
 * price and moving the lookup key across, so checkout charges what admins set.
 * Returns a human-readable note when Stripe refused, otherwise null.
 */
export async function syncStripePrice(
  environment: StripeEnv,
  lookupKey: string,
  amountThb: number,
  productName: string,
  recurring: boolean,
): Promise<string | null> {
  const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
  const unitAmount = Math.round(amountThb * 100);
  try {
    const stripe = createStripeClient(environment);
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const current = existing.data[0];

    if (current && current.unit_amount === unitAmount && current.currency === "thb") return null;

    const productId = current
      ? typeof current.product === "string"
        ? current.product
        : current.product.id
      : (await stripe.products.create({ name: productName })).id;

    await stripe.prices.create({
      product: productId,
      currency: "thb",
      unit_amount: unitAmount,
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      ...(recurring ? { recurring: { interval: "month" as const } } : {}),
    });
    return null;
  } catch (error) {
    return `${lookupKey}: ${getStripeErrorMessage(error)}`;
  }
}
