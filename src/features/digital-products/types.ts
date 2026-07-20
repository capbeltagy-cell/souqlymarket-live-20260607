export const DIGITAL_PRODUCT_TYPES = [
  "pdf",
  "template",
  "course",
  "design",
  "source_code",
  "plugin",
  "license",
] as const;

export type DigitalProductType = (typeof DIGITAL_PRODUCT_TYPES)[number];

export type DigitalProductSummary = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  type: DigitalProductType;
  priceEgp: number;
  coverUrl: string | null;
  publishedAt: string;
};

export type DigitalProductAccess = {
  canBrowse: boolean;
  canPurchase: boolean;
  canPublish: boolean;
  reason?: string;
};
