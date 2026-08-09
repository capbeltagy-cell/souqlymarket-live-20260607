export const featureFlagStatuses = ["enabled", "disabled", "beta", "admin_only"] as const;
export type FeatureFlagStatus = (typeof featureFlagStatuses)[number];

export const featureFlags = {
  affiliate_program: "enabled",
  wallets: "enabled",
  advertisements: "enabled",
  tenders: "enabled",
  ai_tools: "beta",
  auction_system: "disabled",
} as const satisfies Record<string, FeatureFlagStatus>;

export type FeatureFlag = keyof typeof featureFlags;

export function canUseFeature(
  flag: FeatureFlag,
  options: { isAdmin?: boolean; allowBeta?: boolean } = {},
) {
  const status = (featureFlags as Record<FeatureFlag, FeatureFlagStatus>)[flag];
  if (status === "enabled") return true;
  if (status === "admin_only") return Boolean(options.isAdmin);
  if (status === "beta") return Boolean(options.allowBeta || options.isAdmin);
  return false;
}
