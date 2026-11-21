/**
 * Build-time version from package.json. Falls back to "dev" when the code runs
 * outside a Vite build (for example a bare test runner).
 */
export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';