import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { status: "ok", service: "souqly", timestamp: new Date().toISOString() },
          { headers: { "Cache-Control": "no-store" } },
        ),
      HEAD: () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }),
    },
  },
});
