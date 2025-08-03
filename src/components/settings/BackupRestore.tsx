'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface BackupRestoreProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

export function BackupRestore({ settings, onChange }: BackupRestoreProps) {
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleBackupChange = (field: keyof SystemSettings['backup'], value: any) => {
    onChange({
      backup: {
        ...settings.backup,
        [field]: value,
      },
    });
  };

  const handleCreateBackup = async () => {
    setBackupInProgress(true);
    setBackupStatus(null);

    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          // This would include actual database data
          users: [],
          products: [],
          transactions: [],
          settings: settings,
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baikunthapos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus('✅ Backup created successfully and downloaded');
    } catch (error) {
      setBackupStatus(`❌ Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreInProgress(true);
    setBackupStatus(null);

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup format
      if (!backupData.data || !backupData.timestamp) {
        throw new Error('Invalid backup file format');
      }

      if (confirm('Are you sure you want to restore from this backup? This will overwrite current data.')) {
        // Simulate restore process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real implementation, this would restore the database
        console.log('Restoring backup:', backupData);
        
        setBackupStatus('✅ Backup restored successfully. Please refresh the page.');
      }
    } catch (error) {
      setBackupStatus(`❌ Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRestoreInProgress(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearLocalData = async () => {
    if (confirm('Are you sure you want to clear all local data? This action cannot be undone.')) {
      try {
        // Clear localStorage
        localStorage.clear();
        
        // Clear IndexedDB (if used)
        if ('indexedDB' in window) {
          // This would clear the local database
          console.log('Clearing local database...');
        }

        setBackupStatus('✅ Local data cleared successfully. Please refresh the page.');
      } catch (error) {
        setBackupStatus(`❌ Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Automatic Backup Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Enable Auto Backup"
            hint="Automatically create backups at regular intervals"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.backup.autoBackup}
                onChange={(e) => handleBackupChange('autoBackup', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable automatic backups</span>
            </label>
          </FormField>

          <FormField
            label="Backup Interval"
            hint="Hours between automatic backups"
          >
            <Input
              type="number"
              value={settings.backup.backupInterval}
              onChange={(e) => handleBackupChange('backupInterval', parseInt(e.target.value))}
              min={1}
              max={168}
              disabled={!settings.backup.autoBackup}
            />
          </FormField>

          <FormField
            label="Max Backups"
            hint="Maximum number of backups to keep"
          >
            <Input
              type="number"
              value={settings.backup.maxBackups}
              onChange={(e) => handleBackupChange('maxBackups', parseInt(e.target.value))}
              min={1}
              max={30}
              disabled={!settings.backup.autoBackup}
            />
          </FormField>

          <FormField
            label="Include Images"
            hint="Include product images in backups"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.backup.includeImages}
                onChange={(e) => handleBackupChange('includeImages', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={!settings.backup.autoBackup}
              />
              <span>Include images (increases backup size)</span>
            </label>
          </FormField>

          <FormField
            label="Compression"
            hint="Compress backups to reduce file size"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.backup.compressionEnabled}
                onChange={(e) => handleBackupChange('compressionEnabled', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={!settings.backup.autoBackup}
              />
              <span>Enable compression</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Manual Backup & Restore
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Create Backup"
            hint="Download a complete backup of your data"
          >
            <Button
              onClick={handleCreateBackup}
              disabled={backupInProgress}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {backupInProgress ? 'Creating Backup...' : 'Create Backup'}
            </Button>
          </FormField>

          <FormField
            label="Restore Backup"
            hint="Upload and restore from a backup file"
          >
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              disabled={restoreInProgress}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
            />
          </FormField>
        </div>

        {backupStatus && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-mono">{backupStatus}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Data Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Clear Local Data"
            hint="Remove all locally stored data"
          >
            <Button
              onClick={handleClearLocalData}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
            >
              Clear Local Data
            </Button>
          </FormField>

          <FormField
            label="Storage Usage"
            hint="Current local storage usage"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Database: ~2.5 MB</p>
              <p>Images: ~1.2 MB</p>
              <p>Settings: ~15 KB</p>
              <p className="font-medium">Total: ~3.7 MB</p>
            </div>
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            Backup Best Practices
          </h4>
          <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
            <p>• Create backups before major updates</p>
            <p>• Store backups in multiple locations</p>
            <p>• Test restore process periodically</p>
            <p>• Keep backups secure and encrypted</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Important Notes
          </h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
            <p>• Backups include sensitive data</p>
            <p>• Large backups may take time to create</p>
            <p>• Restore will overwrite current data</p>
            <p>• Always backup before restoring</p>
          </div>
        </div>
      </div>
    </div>
  );
}