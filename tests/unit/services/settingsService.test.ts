import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from '@/services/settings/settingsService';
import { DEFAULT_SETTINGS } from '@/types/settings';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (SettingsService as any).instance = undefined;
    settingsService = SettingsService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SettingsService.getInstance();
      const instance2 = SettingsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadSettings', () => {
    it('should load default settings when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const settings = settingsService.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should merge stored settings with defaults', () => {
      const storedSettings = {
        language: 'hi',
        currency: 'USD',
        printer: {
          enabled: false,
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));
      
      // Create new instance to trigger loading
      (SettingsService as any).instance = undefined;
      const newService = SettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings.language).toBe('hi');
      expect(settings.currency).toBe('USD');
      expect(settings.printer.enabled).toBe(false);
      expect(settings.printer.type).toBe(DEFAULT_SETTINGS.printer.type); // Should keep default
    });

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      (SettingsService as any).instance = undefined;
      const newService = SettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('updateSettings', () => {
    it('should update settings and save to localStorage', () => {
      const updates = {
        language: 'hi' as const,
        currency: 'USD' as const,
      };

      settingsService.updateSettings(updates);

      const settings = settingsService.getSettings();
      expect(settings.language).toBe('hi');
      expect(settings.currency).toBe('USD');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should notify listeners when settings change', () => {
      const listener = vi.fn();
      settingsService.subscribe(listener);

      const updates = { language: 'hi' as const };
      settingsService.updateSettings(updates);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'hi' })
      );
    });
  });

  describe('updateNestedSetting', () => {
    it('should update nested settings correctly', () => {
      settingsService.updateNestedSetting('printer', { enabled: false });

      const settings = settingsService.getSettings();
      expect(settings.printer.enabled).toBe(false);
      expect(settings.printer.type).toBe(DEFAULT_SETTINGS.printer.type); // Should preserve other values
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      // First modify settings
      settingsService.updateSettings({ language: 'hi' });
      
      // Then reset
      settingsService.resetToDefaults();
      
      const settings = settingsService.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('resetCategory', () => {
    it('should reset specific category to defaults', () => {
      // Modify printer settings
      settingsService.updateNestedSetting('printer', { enabled: false, type: 'pdf' });
      
      // Reset printer category
      settingsService.resetCategory('printer');
      
      const settings = settingsService.getSettings();
      expect(settings.printer).toEqual(DEFAULT_SETTINGS.printer);
      expect(settings.language).toBe(DEFAULT_SETTINGS.language); // Other settings unchanged
    });
  });

  describe('validateSettings', () => {
    it('should return no errors for valid settings', () => {
      const errors = settingsService.validateSettings(DEFAULT_SETTINGS);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid session timeout', () => {
      const invalidSettings = {
        security: {
          sessionTimeout: 2, // Less than minimum of 5
        },
      };

      const errors = settingsService.validateSettings(invalidSettings);
      expect(errors).toContain('Session timeout must be at least 5 minutes');
    });

    it('should return errors for invalid PIN length', () => {
      const invalidSettings = {
        security: {
          pinComplexity: {
            minLength: 2, // Less than minimum of 4
          },
        },
      };

      const errors = settingsService.validateSettings(invalidSettings);
      expect(errors).toContain('PIN minimum length must be at least 4');
    });

    it('should return errors for invalid sync interval', () => {
      const invalidSettings = {
        sync: {
          interval: 0, // Less than minimum of 1
        },
      };

      const errors = settingsService.validateSettings(invalidSettings);
      expect(errors).toContain('Sync interval must be at least 1 minute');
    });
  });

  describe('exportSettings', () => {
    it('should export settings as JSON string', () => {
      const exported = settingsService.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('importSettings', () => {
    it('should import valid settings JSON', () => {
      const importData = {
        language: 'hi',
        currency: 'USD',
      };

      settingsService.importSettings(JSON.stringify(importData));
      
      const settings = settingsService.getSettings();
      expect(settings.language).toBe('hi');
      expect(settings.currency).toBe('USD');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        settingsService.importSettings('invalid json');
      }).toThrow('Invalid settings format');
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should add and remove listeners correctly', () => {
      const listener = vi.fn();
      const unsubscribe = settingsService.subscribe(listener);

      // Update settings to trigger listener
      settingsService.updateSettings({ language: 'hi' });
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe and update again
      unsubscribe();
      settingsService.updateSettings({ language: 'bn' });
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });
});