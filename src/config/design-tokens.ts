/**
 * Shared semantic values for components that cannot consume CSS custom properties directly.
 * Visual components should prefer Tailwind semantic classes (primary, surface, border, etc.).
 */
export const designTokens = {
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },
  content: {
    maxWidth: 1280,
    readingWidth: 720,
  },
  motion: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  radius: {
    control: "0.75rem",
    card: "1rem",
    panel: "1.5rem",
  },
} as const;

export type DesignTokens = typeof designTokens;
