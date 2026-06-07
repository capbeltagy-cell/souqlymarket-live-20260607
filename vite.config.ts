// On Vercel/Netlify/etc, force the matching nitro preset. The Lovable defaults
// would otherwise fall back to cloudflare-module and produce no Vercel output
// (resulting in 404 NOT_FOUND for every route).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const preset = process.env.NITRO_PRESET
  || (process.env.VERCEL ? "vercel" : undefined)
  || (process.env.NETLIFY ? "netlify" : undefined);

export default defineConfig({
  nitro: preset ? { preset } : true,
  tanstackStart: {
    server: { entry: "server" },
  },
});
