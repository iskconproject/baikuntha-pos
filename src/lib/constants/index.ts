// Application constants for BaikunthaPOS

export const APP_CONFIG = {
  name: 'BaikunthaPOS',
  version: '1.0.0',
  description: 'ISKCON Temple Point of Sale System',
  author: 'ISKCON Asansol Temple',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const

export const PAYMENT_METHODS = {
  CASH: 'cash',
  UPI: 'upi',
} as const

export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const

export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  FAILED: 'failed',
} as const

export const SEARCH_SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NAME: 'name',
  POPULARITY: 'popularity',
} as const

export const DEFAULT_PAGINATION = {
  LIMIT: 20,
  OFFSET: 0,
} as const

export const SESSION_CONFIG = {
  TIMEOUT_MINUTES: 30,
  COOKIE_NAME: 'baikuntha-session',
  COOKIE_MAX_AGE: 30 * 60 * 1000, // 30 minutes in milliseconds
} as const

export const PIN_CONFIG = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 8,
  SALT_ROUNDS: 12,
} as const

export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 10,
  DEBOUNCE_MS: 300,
} as const

export const STOCK_CONFIG = {
  LOW_STOCK_THRESHOLD: 10,
  OUT_OF_STOCK_THRESHOLD: 0,
} as const

export const RECEIPT_CONFIG = {
  TEMPLE_NAME: 'ISKCON Asansol Temple',
  STORE_NAME: 'Gift & Book Store',
  ADDRESS: 'ISKCON Asansol, West Bengal, India',
  PHONE: '+91-XXXX-XXXXXX',
  EMAIL: 'store@iskconasansol.org',
} as const

export const THEME_COLORS = {
  SAFFRON: {
    50: '#FFF8F0',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
    950: '#431407',
  },
  TEMPLE: {
    GOLD: '#FFD700',
    CREAM: '#FFF8DC',
    ORANGE: '#FF6B35',
    RED: '#DC2626',
    BROWN: '#8B4513',
  },
} as const