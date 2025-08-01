// Example of how to use constants throughout the application
// This file demonstrates proper usage patterns

import { 
  USER_ROLES, 
  PAYMENT_METHODS, 
  TRANSACTION_STATUS,
  SESSION_CONFIG,
  PIN_CONFIG,
  STOCK_CONFIG 
} from './index';

// Example: Using role constants in validation
export function isValidUserRole(role: string): boolean {
  return Object.values(USER_ROLES).includes(role as any);
}

// Example: Using payment method constants
export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case PAYMENT_METHODS.CASH:
      return 'Cash Payment';
    case PAYMENT_METHODS.UPI:
      return 'UPI Payment';
    default:
      return 'Unknown Payment Method';
  }
}

// Example: Using transaction status constants
export function isCompletedTransaction(status: string): boolean {
  return status === TRANSACTION_STATUS.COMPLETED;
}

// Example: Using session configuration
export function getSessionCookieName(): string {
  return SESSION_CONFIG.COOKIE_NAME;
}

export function getSessionTimeout(): number {
  return SESSION_CONFIG.TIMEOUT_MINUTES;
}

// Example: Using PIN configuration
export function isValidPinLength(pin: string): boolean {
  return pin.length >= PIN_CONFIG.MIN_LENGTH && pin.length <= PIN_CONFIG.MAX_LENGTH;
}

// Example: Using stock configuration
export function isLowStock(quantity: number): boolean {
  return quantity <= STOCK_CONFIG.LOW_STOCK_THRESHOLD && quantity > STOCK_CONFIG.OUT_OF_STOCK_THRESHOLD;
}

export function isOutOfStock(quantity: number): boolean {
  return quantity <= STOCK_CONFIG.OUT_OF_STOCK_THRESHOLD;
}

// Example: Type-safe role checking
export function hasAdminRole(userRole: string): boolean {
  return userRole === USER_ROLES.ADMIN;
}

export function hasManagerRole(userRole: string): boolean {
  return userRole === USER_ROLES.MANAGER;
}

export function hasCashierRole(userRole: string): boolean {
  return userRole === USER_ROLES.CASHIER;
}

// Example: Using theme colors (for dynamic styling)
export function getSaffronColor(shade: keyof typeof import('./index').THEME_COLORS.SAFFRON): string {
  const { THEME_COLORS } = require('./index');
  return THEME_COLORS.SAFFRON[shade];
}