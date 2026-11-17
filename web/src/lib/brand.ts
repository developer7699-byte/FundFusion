/**
 * The displayed product name. PRD §11: renaming the product is a config
 * change, not a sweep through the codebase. An empty value falls back so the
 * UI never renders an empty string.
 */
export const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME || 'FundFusion'
