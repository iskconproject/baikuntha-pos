'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SystemPreferences } from '@/components/settings/SystemPreferences';
import { PrinterConfiguration } from '@/components/settings/PrinterConfiguration';
import { ReceiptCustomization } from '@/components/settings/ReceiptCustomization';
import { SyncSettings } from '@/components/settings/SyncSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { BackupRestore } from '@/components/settings/BackupRestore';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AuditLogSettings } from '@/components/settings/AuditLogSettings';
import { settingsService } from '@/services/settings/settingsService';
import { SystemSettings, SettingsCategory } from '@/types/settings';

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'system',
    name: 'System Preferences',
    icon: '⚙️',
    description: 'Language, currency, timezone, and date format settings',
  },
  {
    id: 'printer',
    name: 'Printer Configuration',
    icon: '🖨️',
    description: 'Thermal printer setup and testing',
  },
  {
    id: 'receipt',
    name: 'Receipt Customization',
    icon: '🧾',
    description: 'Header, footer, logo, and contact information',
  },
  {
    id: 'sync',
    name: 'Sync Settings',
    icon: '🔄',
    description: 'Automatic sync preferences and intervals',
  },
  {
    id: 'security',
    name: 'Security Settings',
    icon: '🔒',
    description: 'Session timeout, PIN complexity, and trusted devices',
  },
  {
    id: 'backup',
    name: 'Backup & Restore',
    icon: '💾',
    description: 'Local data backup and restore options',
  },
  {
    id: 'display',
    name: 'Display Settings',
    icon: '🎨',
    description: 'Theme, font size, and accessibility options',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: '🔔',
    description: 'Alert preferences and notification settings',
  },
  {
    id: 'audit',
    name: 'Audit Log',
    icon: '📋',
    description: 'Logging settings and data retention policies',
  },
];

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState('system');
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = settingsService.subscribe((newSettings) => {
      setSettings(newSettings);
      setHasChanges(false);
    });

    return unsubscribe;
  }, []);

  const handleSettingsChange = (updates: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const errors = settingsService.validateSettings(settings);
      if (errors.length > 0) {
        alert('Validation errors:\n' + errors.join('\n'));
        return;
      }

      settingsService.updateSettings(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      settingsService.resetToDefaults();
      setHasChanges(false);
    }
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'system':
        return (
          <SystemPreferences
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'printer':
        return (
          <PrinterConfiguration
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'receipt':
        return (
          <ReceiptCustomization
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'sync':
        return (
          <SyncSettings
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'security':
        return (
          <SecuritySettings
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'backup':
        return (
          <BackupRestore
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'display':
        return (
          <DisplaySettings
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'notifications':
        return (
          <NotificationSettings
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      case 'audit':
        return (
          <AuditLogSettings
            settings={settings}
            onChange={handleSettingsChange}
          />
        );
      default:
        return <div>Category not found</div>;
    }
  };

  const activeTab = SETTINGS_CATEGORIES.find(cat => cat.id === activeCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          System Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure system preferences and application behavior
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Categories
            </h2>
            <nav className="space-y-2">
              {SETTINGS_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeCategory === category.id
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm opacity-75">
                        {category.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{activeTab?.icon}</span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeTab?.name}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {activeTab?.description}
              </p>
            </div>

            {/* Category Content */}
            <div className="mb-8">
              {renderCategoryContent()}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleReset}
                className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
              >
                Reset to Defaults
              </Button>

              <div className="flex space-x-3">
                {hasChanges && (
                  <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center">
                    • Unsaved changes
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}