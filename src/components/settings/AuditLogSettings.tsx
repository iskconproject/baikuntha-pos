'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface AuditLogSettingsProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

const LOG_LEVEL_OPTIONS = [
  { value: 'basic', label: 'Basic - Login/logout and major actions' },
  { value: 'detailed', label: 'Detailed - All user actions and system events' },
  { value: 'verbose', label: 'Verbose - Complete activity logging' },
];

export function AuditLogSettings({ settings, onChange }: AuditLogSettingsProps) {
  const [exportingLogs, setExportingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const handleAuditLogChange = (field: keyof SystemSettings['auditLog'], value: any) => {
    onChange({
      auditLog: {
        ...settings.auditLog,
        [field]: value,
      },
    });
  };

  const handleExportLogs = async () => {
    setExportingLogs(true);
    
    try {
      // Simulate log export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sampleLogs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          action: 'USER_LOGIN',
          userId: 'admin',
          details: 'Admin user logged in successfully',
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'INFO',
          action: 'PRODUCT_CREATED',
          userId: 'manager',
          details: 'Created product: Bhagavad Gita',
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'INFO',
          action: 'TRANSACTION_COMPLETED',
          userId: 'cashier',
          details: 'Transaction #1234 completed - ₹472.00',
        },
      ];

      const csvContent = [
        'Timestamp,Level,Action,User,Details',
        ...sampleLogs.map(log => 
          `${log.timestamp},${log.level},${log.action},${log.userId},"${log.details}"`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export audit logs');
    } finally {
      setExportingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
      return;
    }

    setClearingLogs(true);
    
    try {
      // Simulate log clearing
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Audit logs cleared successfully');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      alert('Failed to clear audit logs');
    } finally {
      setClearingLogs(false);
    }
  };

  const getStorageEstimate = () => {
    const { retentionDays, logLevel } = settings.auditLog;
    const baseSize = logLevel === 'basic' ? 0.1 : logLevel === 'detailed' ? 0.5 : 1.0; // MB per day
    return (baseSize * retentionDays).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Audit Logging Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Enable Audit Logging"
            description="Track user actions and system events"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.auditLog.enabled}
                onChange={(e) => handleAuditLogChange('enabled', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable audit logging</span>
            </label>
          </FormField>

          <FormField
            label="Log Level"
            description="Amount of detail to capture in logs"
          >
            <Select
              value={settings.auditLog.logLevel}
              onChange={(e) => handleAuditLogChange('logLevel', e.target.value)}
              options={LOG_LEVEL_OPTIONS}
              disabled={!settings.auditLog.enabled}
            />
          </FormField>

          <FormField
            label="Retention Period"
            description="Days to keep audit logs before automatic cleanup"
          >
            <Input
              type="number"
              value={settings.auditLog.retentionDays}
              onChange={(e) => handleAuditLogChange('retentionDays', parseInt(e.target.value))}
              min={1}
              max={365}
              disabled={!settings.auditLog.enabled}
            />
          </FormField>

          <FormField
            label="Auto Cleanup"
            description="Automatically delete old logs based on retention period"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.auditLog.autoCleanup}
                onChange={(e) => handleAuditLogChange('autoCleanup', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={!settings.auditLog.enabled}
              />
              <span>Enable automatic cleanup</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          What Gets Logged
        </h3>

        <div className="space-y-4">
          <FormField
            label="User Actions"
            description="Log user login, logout, and activity"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.auditLog.includeUserActions}
                onChange={(e) => handleAuditLogChange('includeUserActions', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={!settings.auditLog.enabled}
              />
              <span>Include user actions</span>
            </label>
          </FormField>

          <FormField
            label="System Events"
            description="Log system startup, errors, and configuration changes"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.auditLog.includeSystemEvents}
                onChange={(e) => handleAuditLogChange('includeSystemEvents', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={!settings.auditLog.enabled}
              />
              <span>Include system events</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Log Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Export Logs"
            description="Download audit logs as CSV file"
          >
            <Button
              onClick={handleExportLogs}
              disabled={exportingLogs || !settings.auditLog.enabled}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {exportingLogs ? 'Exporting...' : 'Export Logs'}
            </Button>
          </FormField>

          <FormField
            label="Clear Logs"
            description="Permanently delete all audit logs"
          >
            <Button
              onClick={handleClearLogs}
              disabled={clearingLogs || !settings.auditLog.enabled}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
            >
              {clearingLogs ? 'Clearing...' : 'Clear All Logs'}
            </Button>
          </FormField>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Storage Information
          </h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p>Current log entries: ~1,247</p>
            <p>Estimated storage: ~{getStorageEstimate()} MB</p>
            <p>Oldest entry: 45 days ago</p>
            <p>Next cleanup: {settings.auditLog.autoCleanup ? 'Automatic' : 'Manual'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Audit Log Benefits
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <p>• Track user activity and system changes</p>
            <p>• Investigate security incidents</p>
            <p>• Comply with audit requirements</p>
            <p>• Monitor system performance</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Privacy Considerations
          </h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
            <p>• Logs contain user activity data</p>
            <p>• Regular cleanup prevents data accumulation</p>
            <p>• Export logs securely for compliance</p>
            <p>• Consider local privacy regulations</p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
          Sample Log Entries
        </h4>
        <div className="text-sm text-green-700 dark:text-green-200 font-mono space-y-1">
          <p>2024-01-15 10:30:15 | INFO | USER_LOGIN | admin | Admin user logged in</p>
          <p>2024-01-15 10:32:45 | INFO | PRODUCT_CREATED | manager | Created: Bhagavad Gita</p>
          <p>2024-01-15 10:35:20 | INFO | TRANSACTION | cashier | Sale completed: ₹472.00</p>
          <p>2024-01-15 10:40:10 | WARN | SYNC_FAILED | system | Cloud sync failed, retrying</p>
        </div>
      </div>
    </div>
  );
}