import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/skin-ai")({
  beforeLoad: () => {
    throw redirect({ to: "/mali", search: { tool: "scan" } });
  },
});
