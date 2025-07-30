'use client';

import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { SystemSettings } from '@/types/settings';
import { 
  Globe, 
  DollarSign, 
  Clock, 
  Calendar, 
  Timer, 
  Eye, 
  Info 
} from 'lucide-react';

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
    <div className="space-y-8">
      {/* Localization Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Localization
            </h3>
            <p className="text-sm text-gray-600">
              Configure language and regional preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <FormField
              label="Language"
              helperText="Select the primary language for the interface"
            >
              <div className="relative">
                <Select
                  value={settings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  options={LANGUAGE_OPTIONS}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField
              label="Currency"
              helperText="Default currency for pricing and transactions"
            >
              <div className="relative">
                <Select
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  options={CURRENCY_OPTIONS}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
            </FormField>
          </div>
        </div>
      </div>

      {/* Date & Time Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Date & Time
            </h3>
            <p className="text-sm text-gray-600">
              Configure how dates and times are displayed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <FormField
              label="Timezone"
              helperText="Timezone for timestamps and scheduling"
            >
              <div className="relative">
                <Select
                  value={settings.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  options={TIMEZONE_OPTIONS}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField
              label="Date Format"
              helperText="How dates are displayed throughout the application"
            >
              <div className="relative">
                <Select
                  value={settings.dateFormat}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                  options={DATE_FORMAT_OPTIONS}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField
              label="Time Format"
              helperText="12-hour or 24-hour time display"
            >
              <div className="relative">
                <Select
                  value={settings.timeFormat}
                  onChange={(e) => handleChange('timeFormat', e.target.value)}
                  options={TIME_FORMAT_OPTIONS}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
            </FormField>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-3">
              Preview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-orange-700">Language:</span>
                  <span className="font-medium text-orange-900">
                    {LANGUAGE_OPTIONS.find(opt => opt.value === settings.language)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Currency:</span>
                  <span className="font-medium text-orange-900">
                    {CURRENCY_OPTIONS.find(opt => opt.value === settings.currency)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Timezone:</span>
                  <span className="font-medium text-orange-900">
                    {TIMEZONE_OPTIONS.find(opt => opt.value === settings.timezone)?.label}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-orange-700">Date:</span>
                  <span className="font-medium text-orange-900">
                    {DATE_FORMAT_OPTIONS.find(opt => opt.value === settings.dateFormat)?.label.split(' ')[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Time:</span>
                  <span className="font-medium text-orange-900">
                    {TIME_FORMAT_OPTIONS.find(opt => opt.value === settings.timeFormat)?.label.split(' ')[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Sample Price:</span>
                  <span className="font-medium text-orange-900">
                    {settings.currency === 'INR' ? '₹299.50' : '$3.99'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Regional Settings Information
            </h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              These settings affect how dates, times, numbers, and currency are displayed throughout the application.
              Changes will take effect immediately after saving and will apply to all users on this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}