import { createFileRoute } from "@tanstack/react-router";
import { PropertyBrowser, REAL_ESTATE_SUBTYPES } from "@/components/PropertyBrowser";

export const Route = createFileRoute("/real-estate")({
  head: () => ({
    meta: [
      { title: "Real Estate Marketplace — Souqly" },
      {
        name: "description",
        content: "Apartments, villas, shops, offices and warehouses across Egypt.",
      },
      { property: "og:title", content: "Real Estate Marketplace — Souqly" },
      {
        property: "og:description",
        content: "Apartments, villas, shops, offices and warehouses across Egypt.",
      },
    ],
  }),
  component: () => (
    <PropertyBrowser
      listingType="real_estate"
      subtypes={REAL_ESTATE_SUBTYPES}
      titleAr="سوق العقارات"
      titleEn="Real Estate Marketplace"
    />
  ),
});
