import { registerAs } from '@nestjs/config';

/**
 * The displayed product name. PRD §11: the package and repository stay
 * `fundfusion`; renaming the product is a config change, not a sweep through
 * the codebase. An empty value is treated as unset so the UI never renders ''.
 */
export const platformConfig = registerAs('platform', () => ({
  platformName: process.env.PLATFORM_NAME || 'FundFusion',
}));
