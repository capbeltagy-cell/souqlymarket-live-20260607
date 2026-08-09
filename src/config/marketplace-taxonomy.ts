export const marketplaceDomains = ["products", "services", "assets"] as const;
export type MarketplaceDomain = (typeof marketplaceDomains)[number];

export const marketplaceTaxonomy = {
  products: [
    "food",
    "clothing",
    "packaging",
    "electronics",
    "agriculture",
    "construction",
    "machinery",
    "automotive",
    "industrial_supplies",
  ],
  services: ["logistics", "marketing", "manufacturing", "consulting", "import_export"],
  assets: ["commercial_real_estate", "industrial_land", "factories", "heavy_equipment"],
} as const satisfies Record<MarketplaceDomain, readonly string[]>;

export const organizationKinds = [
  "company",
  "factory",
  "supplier",
  "exporter",
  "importer",
  "service_provider",
] as const;

export type OrganizationKind = (typeof organizationKinds)[number];
