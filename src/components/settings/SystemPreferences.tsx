'use client';

import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { SystemSettings } from '@/types/settings';

interface SystemPreferencesProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'USD', label: 'US Dollar ($)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST)' },
  { value: 'UTC', label: 'UTC' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12 Hour (2:30 PM)' },
  { value: '24h', label: '24 Hour (14:30)' },
];

export function SystemPreferences({ settings, onChange }: SystemPreferencesProps) {
  const handleChange = (field: keyof SystemSettings, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Language"
          description="Select the primary language for the interface"
        >
          <Select
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
            options={LANGUAGE_OPTIONS}
          />
        </FormField>

        <FormField
          label="Currency"
          description="Default currency for pricing and transactions"
        >
          <Select
            value={settings.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            options={CURRENCY_OPTIONS}
          />
        </FormField>

        <FormField
          label="Timezone"
          description="Timezone for timestamps and scheduling"
        >
          <Select
            value={settings.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
        </FormField>

        <FormField
          label="Date Format"
          description="How dates are displayed throughout the application"
        >
          <Select
            value={settings.dateFormat}
            onChange={(e) => handleChange('dateFormat', e.target.value)}
            options={DATE_FORMAT_OPTIONS}
          />
        </FormField>

        <FormField
          label="Time Format"
          description="12-hour or 24-hour time display"
        >
          <Select
            value={settings.timeFormat}
            onChange={(e) => handleChange('timeFormat', e.target.value)}
            options={TIME_FORMAT_OPTIONS}
          />
        </FormField>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Regional Settings
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          These settings affect how dates, times, numbers, and currency are displayed.
          Changes will take effect immediately after saving.
        </p>
      </div>
    </div>
  );
}