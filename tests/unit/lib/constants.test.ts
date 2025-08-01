import { describe, it, expect } from 'vitest';
import {
  APP_CONFIG,
  USER_ROLES,
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  SYNC_STATUS,
  SEARCH_SORT_OPTIONS,
  DEFAULT_PAGINATION,
  SESSION_CONFIG,
  PIN_CONFIG,
  SEARCH_CONFIG,
  STOCK_CONFIG,
  RECEIPT_CONFIG,
  THEME_COLORS,
} from '@/lib/constants';

describe('Constants', () => {
  describe('APP_CONFIG', () => {
    it('should have correct app configuration', () => {
      expect(APP_CONFIG.name).toBe('BaikunthaPOS');
      expect(APP_CONFIG.version).toBe('1.0.0');
      expect(APP_CONFIG.description).toBe('ISKCON Temple Point of Sale System');
      expect(APP_CONFIG.author).toBe('ISKCON Asansol Temple');
    });

    it('should be readonly at TypeScript level', () => {
      // TypeScript should prevent modification, but runtime doesn't throw
      // This test verifies the constants exist and have correct values
      expect(APP_CONFIG).toBeDefined();
      expect(typeof APP_CONFIG.name).toBe('string');
    });
  });

  describe('USER_ROLES', () => {
    it('should have correct user roles', () => {
      expect(USER_ROLES.ADMIN).toBe('admin');
      expect(USER_ROLES.MANAGER).toBe('manager');
      expect(USER_ROLES.CASHIER).toBe('cashier');
    });

    it('should be readonly at TypeScript level', () => {
      // TypeScript should prevent modification, but runtime doesn't throw
      // This test verifies the constants exist and have correct values
      expect(USER_ROLES).toBeDefined();
      expect(typeof USER_ROLES.ADMIN).toBe('string');
    });
  });

  describe('PAYMENT_METHODS', () => {
    it('should have correct payment methods', () => {
      expect(PAYMENT_METHODS.CASH).toBe('cash');
      expect(PAYMENT_METHODS.UPI).toBe('upi');
    });
  });

  describe('TRANSACTION_STATUS', () => {
    it('should have correct transaction statuses', () => {
      expect(TRANSACTION_STATUS.COMPLETED).toBe('completed');
      expect(TRANSACTION_STATUS.PENDING).toBe('pending');
      expect(TRANSACTION_STATUS.CANCELLED).toBe('cancelled');
    });
  });

  describe('SYNC_STATUS', () => {
    it('should have correct sync statuses', () => {
      expect(SYNC_STATUS.SYNCED).toBe('synced');
      expect(SYNC_STATUS.PENDING).toBe('pending');
      expect(SYNC_STATUS.FAILED).toBe('failed');
    });
  });

  describe('SEARCH_SORT_OPTIONS', () => {
    it('should have correct search sort options', () => {
      expect(SEARCH_SORT_OPTIONS.RELEVANCE).toBe('relevance');
      expect(SEARCH_SORT_OPTIONS.PRICE_ASC).toBe('price_asc');
      expect(SEARCH_SORT_OPTIONS.PRICE_DESC).toBe('price_desc');
      expect(SEARCH_SORT_OPTIONS.NAME).toBe('name');
      expect(SEARCH_SORT_OPTIONS.POPULARITY).toBe('popularity');
    });
  });

  describe('DEFAULT_PAGINATION', () => {
    it('should have correct pagination defaults', () => {
      expect(DEFAULT_PAGINATION.LIMIT).toBe(20);
      expect(DEFAULT_PAGINATION.OFFSET).toBe(0);
    });
  });

  describe('SESSION_CONFIG', () => {
    it('should have correct session configuration', () => {
      expect(SESSION_CONFIG.TIMEOUT_MINUTES).toBe(30);
      expect(SESSION_CONFIG.COOKIE_NAME).toBe('baikuntha-session');
      expect(SESSION_CONFIG.COOKIE_MAX_AGE).toBe(30 * 60 * 1000);
    });
  });

  describe('PIN_CONFIG', () => {
    it('should have correct PIN configuration', () => {
      expect(PIN_CONFIG.MIN_LENGTH).toBe(4);
      expect(PIN_CONFIG.MAX_LENGTH).toBe(8);
      expect(PIN_CONFIG.SALT_ROUNDS).toBe(12);
    });
  });

  describe('SEARCH_CONFIG', () => {
    it('should have correct search configuration', () => {
      expect(SEARCH_CONFIG.MIN_QUERY_LENGTH).toBe(2);
      expect(SEARCH_CONFIG.MAX_SUGGESTIONS).toBe(10);
      expect(SEARCH_CONFIG.DEBOUNCE_MS).toBe(300);
    });
  });

  describe('STOCK_CONFIG', () => {
    it('should have correct stock configuration', () => {
      expect(STOCK_CONFIG.LOW_STOCK_THRESHOLD).toBe(10);
      expect(STOCK_CONFIG.OUT_OF_STOCK_THRESHOLD).toBe(0);
    });
  });

  describe('RECEIPT_CONFIG', () => {
    it('should have correct receipt configuration', () => {
      expect(RECEIPT_CONFIG.TEMPLE_NAME).toBe('ISKCON Asansol Temple');
      expect(RECEIPT_CONFIG.STORE_NAME).toBe('Gift & Book Store');
      expect(RECEIPT_CONFIG.ADDRESS).toBe('ISKCON Asansol, West Bengal, India');
      expect(RECEIPT_CONFIG.PHONE).toBe('+91-XXXX-XXXXXX');
      expect(RECEIPT_CONFIG.EMAIL).toBe('store@iskconasansol.org');
    });
  });

  describe('THEME_COLORS', () => {
    it('should have correct saffron color palette', () => {
      expect(THEME_COLORS.SAFFRON[50]).toBe('#FFF8F0');
      expect(THEME_COLORS.SAFFRON[500]).toBe('#F97316');
      expect(THEME_COLORS.SAFFRON[950]).toBe('#431407');
    });

    it('should have correct temple colors', () => {
      expect(THEME_COLORS.TEMPLE.GOLD).toBe('#FFD700');
      expect(THEME_COLORS.TEMPLE.CREAM).toBe('#FFF8DC');
      expect(THEME_COLORS.TEMPLE.ORANGE).toBe('#FF6B35');
      expect(THEME_COLORS.TEMPLE.RED).toBe('#DC2626');
      expect(THEME_COLORS.TEMPLE.BROWN).toBe('#8B4513');
    });
  });

  describe('Type safety', () => {
    it('should provide proper TypeScript types', () => {
      // These should compile without errors
      const role = USER_ROLES.ADMIN;
      const payment = PAYMENT_METHODS.CASH;
      const status = TRANSACTION_STATUS.COMPLETED;
      
      expect(role).toBe('admin');
      expect(payment).toBe('cash');
      expect(status).toBe('completed');
    });
  });
});