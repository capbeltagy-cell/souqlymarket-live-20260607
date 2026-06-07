// @lovable.dev/vite-tanstack-config defaults nitro to off outside Lovable sandboxes.
// Enable it for self-hosted deploys (Vercel/Netlify/etc). Nitro auto-detects
// the target via NITRO_PRESET or platform env vars (VERCEL=1 → vercel preset).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: true,
  tanstackStart: {
    server: { entry: "server" },
  },
});
