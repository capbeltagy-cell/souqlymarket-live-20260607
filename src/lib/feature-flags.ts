/**
 * Product feature flags.
 *
 * The legacy classifieds/marketplace surface is hidden rather than deleted,
 * so production data remains untouched and the change is reversible.
 */
export const MARKETPLACE_ENABLED = false;
export const AD_PROMOTIONS_ENABLED = MARKETPLACE_ENABLED;
export const MARKETPLACE_WIDGETS_ENABLED = MARKETPLACE_ENABLED;
export const MARKETER_ENABLED = false;
