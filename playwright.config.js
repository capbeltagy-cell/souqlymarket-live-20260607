-- Playwright tests: basic E2E flows for critical paths

module.exports = {
  timeout: 120000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
  },
};
