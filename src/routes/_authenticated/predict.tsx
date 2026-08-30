import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/predict")({
  beforeLoad: () => {
    throw redirect({ to: "/mali", search: { tool: "before-after" } });
  },
});
