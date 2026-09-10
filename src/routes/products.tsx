import { createFileRoute, redirect } from "@tanstack/react-router";

// Skincare shop is retired from navigation; send any existing links to the catalogue.
export const Route = createFileRoute("/products")({
  beforeLoad: () => {
    throw redirect({ to: "/pricing" });
  },
});
