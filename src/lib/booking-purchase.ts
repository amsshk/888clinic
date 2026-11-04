/** Called only after a booking request has been saved successfully. */
export async function trackBookingPurchase(email: string, phone: string): Promise<void> {
  try {
    const response = await fetch("https://pro.888clinic.co/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        email,
        phone,
        value: 1500,
        currency: "THB",
        contentIds: ["booking"],
      }),
    });
    if (!response.ok) console.warn("Booking purchase tracking failed:", response.status);
  } catch {
    // Tracking must never prevent a successful booking confirmation.
    console.warn("Booking purchase tracking unavailable");
  }
}
