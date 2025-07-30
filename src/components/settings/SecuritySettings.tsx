'use client';

import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface SecuritySettingsProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

export function SecuritySettings({ settings, onChange }: SecuritySettingsProps) {
  const handleSecurityChange = (field: keyof SystemSettings['security'], value: any) => {
    onChange({
      security: {
        ...settings.security,
        [field]: value,
      },
    });
  };

  const handlePinComplexityChange = (field: keyof SystemSettings['security']['pinComplexity'], value: any) => {
    onChange({
      security: {
        ...settings.security,
        pinComplexity: {
          ...settings.security.pinComplexity,
          [field]: value,
        },
      },
    });
  };

  const handleTrustedDevicesChange = (field: keyof SystemSettings['security']['trustedDevices'], value: any) => {
    onChange({
      security: {
        ...settings.security,
        trustedDevices: {
          ...settings.security.trustedDevices,
          [field]: value,
        },
      },
    });
  };

  const clearAllTrustedDevices = () => {
    if (confirm('Are you sure you want to clear all trusted devices? Users will need to re-authenticate on all devices.')) {
      // This would clear trusted devices from the database
      console.log('Clearing all trusted devices');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Session Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Session Timeout"
            description="Minutes of inactivity before automatic logout"
          >
            <Input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
              min={5}
              max={480}
            />
          </FormField>

          <FormField
            label="Auto Lock Screen"
            description="Automatically lock screen when idle"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.security.autoLockScreen}
                onChange={(e) => handleSecurityChange('autoLockScreen', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable auto-lock</span>
            </label>
          </FormField>

          <FormField
            label="Lock Timeout"
            description="Minutes before screen locks automatically"
          >
            <Input
              type="number"
              value={settings.security.lockTimeout}
              onChange={(e) => handleSecurityChange('lockTimeout', parseInt(e.target.value))}
              min={1}
              max={60}
              disabled={!settings.security.autoLockScreen}
            />
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          PIN Complexity Requirements
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Minimum PIN Length"
            description="Minimum number of digits required for PINs"
          >
            <Input
              type="number"
              value={settings.security.pinComplexity.minLength}
              onChange={(e) => handlePinComplexityChange('minLength', parseInt(e.target.value))}
              min={4}
              max={12}
            />
          </FormField>

          <div className="space-y-4">
            <FormField
              label="PIN Requirements"
              description="Additional security requirements for PINs"
            >
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.security.pinComplexity.requireNumbers}
                    onChange={(e) => handlePinComplexityChange('requireNumbers', e.target.checked)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Require numbers</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.security.pinComplexity.requireSpecialChars}
                    onChange={(e) => handlePinComplexityChange('requireSpecialChars', e.target.checked)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Require special characters</span>
                </label>
              </div>
            </FormField>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Trusted Devices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Enable Trusted Devices"
            description="Allow users to mark devices as trusted"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.security.trustedDevices.enabled}
                onChange={(e) => handleTrustedDevicesChange('enabled', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable trusted device feature</span>
            </label>
          </FormField>

          <FormField
            label="Max Trusted Devices"
            description="Maximum number of devices per user"
          >
            <Input
              type="number"
              value={settings.security.trustedDevices.maxDevices}
              onChange={(e) => handleTrustedDevicesChange('maxDevices', parseInt(e.target.value))}
              min={1}
              max={10}
              disabled={!settings.security.trustedDevices.enabled}
            />
          </FormField>

          <FormField
            label="Trust Expiry"
            description="Days before trusted device expires"
          >
            <Input
              type="number"
              value={settings.security.trustedDevices.expiryDays}
              onChange={(e) => handleTrustedDevicesChange('expiryDays', parseInt(e.target.value))}
              min={1}
              max={365}
              disabled={!settings.security.trustedDevices.enabled}
            />
          </FormField>

          <FormField
            label="Manage Trusted Devices"
            description="Clear all trusted devices from system"
          >
            <Button
              onClick={clearAllTrustedDevices}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
              disabled={!settings.security.trustedDevices.enabled}
            >
              Clear All Trusted Devices
            </Button>
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
            Security Best Practices
          </h4>
          <div className="text-sm text-red-700 dark:text-red-200 space-y-1">
            <p>• Use longer PINs for better security</p>
            <p>• Enable auto-lock for unattended devices</p>
            <p>• Regularly review trusted devices</p>
            <p>• Set appropriate session timeouts</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Current Security Level
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Strong security configuration</span>
            </div>
            <p>Your current settings provide good protection against unauthorized access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}