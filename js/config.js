/**
 * Application configuration.
 */
const CONFIG = {
  API_BASE: 'https://simsy-reporting-api.jim-42e.workers.dev/api/v1',
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  CACHE_TTL_MS: 60000, // 60 seconds

  ORGS: {
    'Allsee Technologies Limited': '634a3e09-9e6e-4758-a73b-1abcf9d12809',
    'Cellular-Lan': '37d2ceba-af8b-4877-b2a1-b58c3a366b1a',
    'SIMSY_application (S-IMSY)': '4199c6bb-6c2b-4dcc-904b-b189003b6c97',
    'Travel-SIMSY': '4e01aa70-bd3a-45ea-9fd0-2e76b1a5440a',
    'Eclipse': 'fccdba5d-46a2-4212-bb8a-1fc1e48fb326',
    'Trvllr': 'a1b2c3d4-trvllr-test-token-0001',
  },

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
