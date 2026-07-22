import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://souqlymarket.com";

const STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/marketplace",
  "/stores",
  "/companies",
  "/agents",
  "/factories",
  "/categories",
  "/rfq",
  "/tenders",
  "/wholesale",
  "/real-estate",
  "/lands",
  "/map",
  "/search",
  "/search-all",
  "/subscribe",
  "/business-solutions",
  "/digital-products",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = STATIC_PATHS.map(
          (p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
