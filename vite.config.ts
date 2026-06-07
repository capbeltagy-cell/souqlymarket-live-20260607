// @lovable.dev/vite-tanstack-config defaults to nitro off outside the Lovable
// sandbox. For self-hosted deploys (Vercel/Netlify/Node), force nitro on and
// pick the matching preset so the platform-specific output is generated.
//
// Inside the Lovable sandbox this preset hint is ignored — the wrapper
// forces the cloudflare-module preset for Lovable's own edge.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const preset =
  process.env.NITRO_PRESET ||
  (process.env.VERCEL ? "vercel" : undefined) ||
  (process.env.NETLIFY ? "netlify" : undefined);

export default defineConfig({
  nitro: preset ? { preset } : true,
  tanstackStart: {
    server: { entry: "server" },
  },
});
