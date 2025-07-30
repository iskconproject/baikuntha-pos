'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Settings, 
  Printer, 
  Receipt, 
  RefreshCw, 
  Shield, 
  HardDrive, 
  Palette, 
  Bell, 
  FileText,
  Save,
  RotateCcw
} from 'lucide-react';
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
    icon: Settings,
    description: 'Language, currency, timezone, and date format settings',
  },
  {
    id: 'printer',
    name: 'Printer Configuration',
    icon: Printer,
    description: 'Thermal printer setup and testing',
  },
  {
    id: 'receipt',
    name: 'Receipt Customization',
    icon: Receipt,
    description: 'Header, footer, logo, and contact information',
  },
  {
    id: 'sync',
    name: 'Sync Settings',
    icon: RefreshCw,
    description: 'Automatic sync preferences and intervals',
  },
  {
    id: 'security',
    name: 'Security Settings',
    icon: Shield,
    description: 'Session timeout, PIN complexity, and trusted devices',
  },
  {
    id: 'backup',
    name: 'Backup & Restore',
    icon: HardDrive,
    description: 'Local data backup and restore options',
  },
  {
    id: 'display',
    name: 'Display Settings',
    icon: Palette,
    description: 'Theme, font size, and accessibility options',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description: 'Alert preferences and notification settings',
  },
  {
    id: 'audit',
    name: 'Audit Log',
    icon: FileText,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                System Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Configure system preferences and application behavior
              </p>
            </div>
          </div>
          
          {/* Status Indicator */}
          {hasChanges && (
            <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-amber-800 font-medium">
                You have unsaved changes
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500">
                <h2 className="text-lg font-semibold text-white">
                  Settings Categories
                </h2>
              </div>
              <nav className="p-4 space-y-1">
                {SETTINGS_CATEGORIES.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                        activeCategory === category.id
                          ? 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900 shadow-md border border-orange-200'
                          : 'hover:bg-gray-50 text-gray-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`transition-transform duration-200 ${
                          activeCategory === category.id ? 'scale-110' : 'group-hover:scale-105'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            activeCategory === category.id ? 'text-orange-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1 truncate">
                            {category.name}
                          </div>
                          <div className="text-xs opacity-75 leading-relaxed">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Content Header */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                    {activeTab?.icon && <activeTab.icon className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {activeTab?.name}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {activeTab?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Content */}
              <div className="p-6">
                {renderCategoryContent()}
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>

                  <div className="flex items-center space-x-4">
                    {hasChanges && (
                      <div className="flex items-center space-x-2 text-amber-600">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Unsaved changes</span>
                      </div>
                    )}
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || saving}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}