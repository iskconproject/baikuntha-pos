'use client';

import { useEffect } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { SystemSettings } from '@/types/settings';
import { settingsService } from '@/services/settings/settingsService';

interface DisplaySettingsProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
  { value: 'auto', label: 'Auto (System)' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (14px)' },
  { value: 'medium', label: 'Medium (16px)' },
  { value: 'large', label: 'Large (18px)' },
];

const TOUCH_SENSITIVITY_OPTIONS = [
  { value: 'low', label: 'Low Sensitivity' },
  { value: 'medium', label: 'Medium Sensitivity' },
  { value: 'high', label: 'High Sensitivity' },
];

export function DisplaySettings({ settings, onChange }: DisplaySettingsProps) {
  const handleDisplayChange = (field: keyof SystemSettings['display'], value: any) => {
    const newSettings = {
      display: {
        ...settings.display,
        [field]: value,
      },
    };
    onChange(newSettings);
  };

  // Apply theme changes immediately for preview
  useEffect(() => {
    settingsService.applyTheme();
  }, [settings.display.theme, settings.display.fontSize, settings.display.highContrast]);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Theme & Appearance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Theme"
            description="Choose your preferred color scheme"
          >
            <Select
              value={settings.display.theme}
              onChange={(e) => handleDisplayChange('theme', e.target.value)}
              options={THEME_OPTIONS}
            />
          </FormField>

          <FormField
            label="Font Size"
            description="Adjust text size for better readability"
          >
            <Select
              value={settings.display.fontSize}
              onChange={(e) => handleDisplayChange('fontSize', e.target.value)}
              options={FONT_SIZE_OPTIONS}
            />
          </FormField>

          <FormField
            label="High Contrast"
            description="Increase contrast for better visibility"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.display.highContrast}
                onChange={(e) => handleDisplayChange('highContrast', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable high contrast mode</span>
            </label>
          </FormField>

          <FormField
            label="Color Blind Mode"
            description="Adjust colors for color vision deficiency"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.display.colorBlindMode}
                onChange={(e) => handleDisplayChange('colorBlindMode', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable color blind friendly mode</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Touch & Interaction
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Touch Sensitivity"
            description="Adjust touch responsiveness for your device"
          >
            <Select
              value={settings.display.touchSensitivity}
              onChange={(e) => handleDisplayChange('touchSensitivity', e.target.value)}
              options={TOUCH_SENSITIVITY_OPTIONS}
            />
          </FormField>

          <FormField
            label="Animations"
            description="Enable or disable interface animations"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.display.animations}
                onChange={(e) => handleDisplayChange('animations', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable animations and transitions</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Preview
        </h3>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Sample Interface</h4>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-700 p-4 rounded border">
                <h5 className="font-medium mb-2">Product Card</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bhagavad Gita - As It Is
                </p>
                <p className="text-lg font-bold text-orange-600">₹250.00</p>
              </div>

              <div className="bg-white dark:bg-gray-700 p-4 rounded border">
                <h5 className="font-medium mb-2">Button Styles</h5>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                    Primary Button
                  </button>
                  <button className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    Secondary Button
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 p-4 rounded border">
              <h5 className="font-medium mb-2">Text Samples</h5>
              <p className="text-sm">Small text - Perfect for descriptions and details</p>
              <p className="text-base">Medium text - Standard for most content</p>
              <p className="text-lg">Large text - Great for headings and important info</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Accessibility Features
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <p>• High contrast improves text readability</p>
            <p>• Larger fonts help users with vision difficulties</p>
            <p>• Color blind mode uses accessible color combinations</p>
            <p>• Touch sensitivity adapts to different devices</p>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            Performance Tips
          </h4>
          <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
            <p>• Disable animations on slower devices</p>
            <p>• Auto theme follows system preferences</p>
            <p>• Dark theme can save battery on OLED screens</p>
            <p>• Settings apply immediately for testing</p>
          </div>
        </div>
      </div>
    </div>
  );
}