import { SystemSettings, DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_KEY = 'vaikunthapos_settings';

export class SettingsService {
  private static instance: SettingsService;
  private settings: SystemSettings;
  private listeners: Set<(settings: SystemSettings) => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private loadSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private mergeWithDefaults(stored: Partial<SystemSettings>): SystemSettings {
    const merged = { ...DEFAULT_SETTINGS };
    
    // Deep merge stored settings with defaults
    Object.keys(stored).forEach(key => {
      const typedKey = key as keyof SystemSettings;
      if (typeof stored[typedKey] === 'object' && stored[typedKey] !== null) {
        merged[typedKey] = { ...merged[typedKey], ...stored[typedKey] } as any;
      } else {
        (merged as any)[typedKey] = stored[typedKey];
      }
    });
    
    return merged;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>): void {
    this.settings = this.mergeWithDefaults({ ...this.settings, ...updates });
    this.saveSettings();
  }

  updateNestedSetting<T extends keyof SystemSettings>(
    category: T,
    updates: Partial<SystemSettings[T]>
  ): void {
    this.settings[category] = { ...this.settings[category], ...updates } as SystemSettings[T];
    this.saveSettings();
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  resetCategory<T extends keyof SystemSettings>(category: T): void {
    this.settings[category] = { ...DEFAULT_SETTINGS[category] };
    this.saveSettings();
  }

  subscribe(listener: (settings: SystemSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Export settings for backup
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings from backup
  importSettings(settingsJson: string): void {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = this.mergeWithDefaults(imported);
      this.saveSettings();
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings format');
    }
  }

  // Validate settings
  validateSettings(settings: Partial<SystemSettings>): string[] {
    const errors: string[] = [];

    if (settings.security?.sessionTimeout !== undefined && settings.security.sessionTimeout < 5) {
      errors.push('Session timeout must be at least 5 minutes');
    }

    if (settings.security?.pinComplexity?.minLength !== undefined && settings.security.pinComplexity.minLength < 4) {
      errors.push('PIN minimum length must be at least 4');
    }

    if (settings.sync?.interval !== undefined && settings.sync.interval < 1) {
      errors.push('Sync interval must be at least 1 minute');
    }

    if (settings.backup?.backupInterval !== undefined && settings.backup.backupInterval < 1) {
      errors.push('Backup interval must be at least 1 hour');
    }

    if (settings.auditLog?.retentionDays !== undefined && settings.auditLog.retentionDays < 1) {
      errors.push('Audit log retention must be at least 1 day');
    }

    return errors;
  }

  // Test printer connection
  async testPrinter(): Promise<boolean> {
    try {
      if (!this.settings.printer.enabled) {
        throw new Error('Printer is disabled');
      }

      // Import thermal printer service
      const { ThermalPrinterService } = await import('@/services/printer/thermalPrinter');
      const printer = new ThermalPrinterService();
      
      return await printer.testConnection();
    } catch (error) {
      console.error('Printer test failed:', error);
      return false;
    }
  }

  // Apply theme changes
  applyTheme(): void {
    const { theme } = this.settings.display;
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.fontSize = fontSizeMap[this.settings.display.fontSize];

    // Apply high contrast
    if (this.settings.display.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }

  // Get localized strings based on language setting
  getLocalizedString(key: string): string {
    // This would integrate with an i18n system
    // For now, return the key as placeholder
    return key;
  }
}

export const settingsService = SettingsService.getInstance();