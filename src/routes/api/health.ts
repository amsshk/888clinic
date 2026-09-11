import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { ok: true, service: "888clinic" },
          { headers: { "cache-control": "no-store" } },
        ),
      HEAD: () =>
        new Response(null, {
          status: 204,
          headers: { "cache-control": "no-store" },
        }),
    },
  },
});
