const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-red-100 border-b border-red-300 px-4 py-2 text-center text-sm text-red-800">
        Checkout is not configured yet. Online payments are unavailable — please book or pay at the clinic.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-amber-50 border-b border-gold/30 px-4 py-2 text-center text-sm text-gold-deep">
        Payments are in test mode — no real money is charged.
      </div>
    );
  }
  return null;
}
