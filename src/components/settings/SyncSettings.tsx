'use client';

import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface SyncSettingsProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

const SYNC_MODE_OPTIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual Only' },
];

const CONFLICT_RESOLUTION_OPTIONS = [
  { value: 'timestamp', label: 'Latest Timestamp Wins' },
  { value: 'manual', label: 'Manual Resolution' },
];

const SYNC_INTERVAL_OPTIONS = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];

export function SyncSettings({ settings, onChange }: SyncSettingsProps) {
  const handleSyncChange = (field: keyof SystemSettings['sync'], value: any) => {
    onChange({
      sync: {
        ...settings.sync,
        [field]: value,
      },
    });
  };

  const handleManualSync = async () => {
    // This would trigger a manual sync
    console.log('Manual sync triggered');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Sync Mode"
          description="How data synchronization should be handled"
        >
          <Select
            value={settings.sync.mode}
            onChange={(e) => handleSyncChange('mode', e.target.value)}
            options={SYNC_MODE_OPTIONS}
          />
        </FormField>

        <FormField
          label="Sync Interval"
          description="How often automatic sync should occur"
        >
          <Select
            value={settings.sync.interval.toString()}
            onChange={(e) => handleSyncChange('interval', parseInt(e.target.value))}
            options={SYNC_INTERVAL_OPTIONS}
            disabled={settings.sync.mode === 'manual'}
          />
        </FormField>

        <FormField
          label="Auto Retry"
          description="Automatically retry failed sync operations"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.sync.autoRetry}
              onChange={(e) => handleSyncChange('autoRetry', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span>Enable automatic retry</span>
          </label>
        </FormField>

        <FormField
          label="Max Retries"
          description="Maximum number of retry attempts"
        >
          <Input
            type="number"
            value={settings.sync.maxRetries}
            onChange={(e) => handleSyncChange('maxRetries', parseInt(e.target.value))}
            min={1}
            max={10}
            disabled={!settings.sync.autoRetry}
          />
        </FormField>

        <FormField
          label="Conflict Resolution"
          description="How to handle data conflicts during sync"
        >
          <Select
            value={settings.sync.conflictResolution}
            onChange={(e) => handleSyncChange('conflictResolution', e.target.value)}
            options={CONFLICT_RESOLUTION_OPTIONS}
          />
        </FormField>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Manual Sync Control
        </h3>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleManualSync}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Sync Now
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Last sync: 2 minutes ago</p>
            <p>Status: ✅ All data synchronized</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            Automatic Sync Benefits
          </h4>
          <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
            <p>• Real-time data consistency across devices</p>
            <p>• Automatic backup of transactions</p>
            <p>• Reduced risk of data loss</p>
            <p>• Seamless multi-device operation</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Manual Sync Considerations
          </h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
            <p>• Requires manual intervention</p>
            <p>• May lead to data inconsistencies</p>
            <p>• Better for limited connectivity scenarios</p>
            <p>• Gives full control over sync timing</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Sync Process
        </h4>
        <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <p>1. Local changes are queued for synchronization</p>
          <p>2. System checks for internet connectivity</p>
          <p>3. Data is uploaded to cloud database</p>
          <p>4. Remote changes are downloaded and merged</p>
          <p>5. Conflicts are resolved based on your settings</p>
        </div>
      </div>
    </div>
  );
}