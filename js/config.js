/**
 * Application configuration.
 */
const CONFIG = {
  API_BASE: 'https://simsy-reporting-api.jim-42e.workers.dev/api/v1',
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  CACHE_TTL_MS: 60000, // 60 seconds

  DATE_RANGES: {
    '7d':   { label: 'Last 7 days',   days: 7 },
    '30d':  { label: 'Last 30 days',  days: 30 },
    '90d':  { label: 'Last 90 days',  days: 90 },
    '180d': { label: 'Last 180 days', days: 180 },
    '365d': { label: 'Last 365 days', days: 365 },
  },

  STORAGE_KEYS: {
    TOKEN: 'simsy_token',
    ORG: 'simsy_org',
  },
};
