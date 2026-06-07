// @lovable.dev/vite-tanstack-config defaults nitro to the cloudflare preset.
// Override with NITRO_PRESET env (Vercel sets VERCEL=1 automatically).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = !!process.env.VERCEL;

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
      preset: isVercel ? "vercel" : undefined,
    },
  },
});
