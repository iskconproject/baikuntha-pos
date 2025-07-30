export interface SystemSettings {
  // System Preferences
  language: 'en' | 'hi' | 'bn';
  currency: 'INR' | 'USD';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';

  // Printer Configuration
  printer: {
    enabled: boolean;
    type: 'thermal' | 'pdf';
    deviceId?: string;
    paperWidth: number;
    characterWidth: number;
    testPrintEnabled: boolean;
  };

  // Receipt Customization
  receipt: {
    header: string;
    footer: string;
    logo?: string;
    contactInfo: {
      address: string;
      phone: string;
      email: string;
      website?: string;
    };
    showQR: boolean;
    showBarcode: boolean;
  };

  // Sync Settings
  sync: {
    mode: 'automatic' | 'manual';
    interval: number; // minutes
    autoRetry: boolean;
    maxRetries: number;
    conflictResolution: 'timestamp' | 'manual';
  };

  // Security Settings
  security: {
    sessionTimeout: number; // minutes
    pinComplexity: {
      minLength: number;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    trustedDevices: {
      enabled: boolean;
      maxDevices: number;
      expiryDays: number;
    };
    autoLockScreen: boolean;
    lockTimeout: number; // minutes
  };

  // Backup and Restore
  backup: {
    autoBackup: boolean;
    backupInterval: number; // hours
    maxBackups: number;
    includeImages: boolean;
    compressionEnabled: boolean;
  };

  // Theme and Display
  display: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    touchSensitivity: 'low' | 'medium' | 'high';
    animations: boolean;
    highContrast: boolean;
    colorBlindMode: boolean;
  };

  // Notification Preferences
  notifications: {
    syncStatus: boolean;
    lowStock: boolean;
    systemAlerts: boolean;
    transactionAlerts: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };

  // Audit Log Settings
  auditLog: {
    enabled: boolean;
    retentionDays: number;
    logLevel: 'basic' | 'detailed' | 'verbose';
    includeUserActions: boolean;
    includeSystemEvents: boolean;
    autoCleanup: boolean;
  };
}

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'file';
  description?: string;
  options?: { value: string; label: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  dependency?: {
    field: string;
    value: any;
  };
}

export const DEFAULT_SETTINGS: SystemSettings = {
  language: 'en',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  
  printer: {
    enabled: true,
    type: 'thermal',
    paperWidth: 80,
    characterWidth: 48,
    testPrintEnabled: true,
  },
  
  receipt: {
    header: 'ISKCON Asansol Temple\nGift & Book Store',
    footer: 'Thank you for your visit!\nHare Krishna!',
    contactInfo: {
      address: 'ISKCON Asansol Temple, West Bengal',
      phone: '+91-XXXXXXXXXX',
      email: 'info@iskconasansol.org',
    },
    showQR: false,
    showBarcode: false,
  },
  
  sync: {
    mode: 'automatic',
    interval: 5,
    autoRetry: true,
    maxRetries: 3,
    conflictResolution: 'timestamp',
  },
  
  security: {
    sessionTimeout: 30,
    pinComplexity: {
      minLength: 4,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    trustedDevices: {
      enabled: false,
      maxDevices: 3,
      expiryDays: 30,
    },
    autoLockScreen: true,
    lockTimeout: 10,
  },
  
  backup: {
    autoBackup: true,
    backupInterval: 24,
    maxBackups: 7,
    includeImages: false,
    compressionEnabled: true,
  },
  
  display: {
    theme: 'light',
    fontSize: 'medium',
    touchSensitivity: 'medium',
    animations: true,
    highContrast: false,
    colorBlindMode: false,
  },
  
  notifications: {
    syncStatus: true,
    lowStock: true,
    systemAlerts: true,
    transactionAlerts: false,
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  auditLog: {
    enabled: true,
    retentionDays: 90,
    logLevel: 'detailed',
    includeUserActions: true,
    includeSystemEvents: true,
    autoCleanup: true,
  },
};