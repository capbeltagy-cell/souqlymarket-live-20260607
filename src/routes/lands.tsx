import { createFileRoute } from "@tanstack/react-router";
import { PropertyBrowser, LAND_SUBTYPES } from "@/components/PropertyBrowser";

export const Route = createFileRoute("/lands")({
  head: () => ({
    meta: [
      { title: "Lands Marketplace — Souqly" },
      {
        name: "description",
        content: "Agricultural, industrial, investment and building lands across Egypt.",
      },
      { property: "og:title", content: "Lands Marketplace — Souqly" },
      {
        property: "og:description",
        content: "Agricultural, industrial, investment and building lands across Egypt.",
      },
    ],
  }),
  component: () => (
    <PropertyBrowser
      listingType="land"
      subtypes={LAND_SUBTYPES}
      titleAr="سوق الأراضي"
      titleEn="Lands Marketplace"
    />
  ),
});
