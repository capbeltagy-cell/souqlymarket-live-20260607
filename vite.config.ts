import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const preset =
  process.env.NITRO_PRESET ||
  (process.env.VERCEL ? "vercel" : undefined) ||
  (process.env.NETLIFY ? "netlify" : undefined);

export default defineConfig(({ command }) => ({
  server: { host: "::", port: 8080 },
  css: { transformer: "lightningcss" },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro(preset ? { preset } : {})] : []),
    react(),
  ],
}));
