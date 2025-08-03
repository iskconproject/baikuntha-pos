'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface NotificationSettingsProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

export function NotificationSettings({ settings, onChange }: NotificationSettingsProps) {
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [testingNotification, setTestingNotification] = useState(false);

  const handleNotificationChange = (field: keyof SystemSettings['notifications'], value: any) => {
    onChange({
      notifications: {
        ...settings.notifications,
        [field]: value,
      },
    });
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setPermissionStatus(permission);
      return permission;
    }
    setPermissionStatus('not-supported');
    return 'not-supported';
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        handleNotificationChange('pushNotifications', true);
      }
    }
  };

  const testNotification = async () => {
    setTestingNotification(true);
    
    try {
      const permission = await checkNotificationPermission();
      
      if (permission === 'granted') {
        new Notification('BaikunthaPOS Test', {
          body: 'This is a test notification from your POS system.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'test-notification',
        });
      } else if (permission === 'default') {
        await requestNotificationPermission();
      } else {
        alert('Notifications are blocked. Please enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Notification test failed:', error);
      alert('Failed to send test notification.');
    } finally {
      setTestingNotification(false);
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return '✅ Notifications enabled';
      case 'denied':
        return '❌ Notifications blocked';
      case 'default':
        return '⚠️ Permission not requested';
      case 'not-supported':
        return '❌ Not supported in this browser';
      default:
        return '❓ Unknown status';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Notification Types
        </h3>

        <div className="space-y-4">
          <FormField
            label="Sync Status Notifications"
            hint="Get notified about data synchronization status"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.syncStatus}
                onChange={(e) => handleNotificationChange('syncStatus', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable sync status notifications</span>
            </label>
          </FormField>

          <FormField
            label="Low Stock Alerts"
            hint="Get notified when products are running low"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.lowStock}
                onChange={(e) => handleNotificationChange('lowStock', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable low stock alerts</span>
            </label>
          </FormField>

          <FormField
            label="System Alerts"
            hint="Get notified about system errors and important updates"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.systemAlerts}
                onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable system alerts</span>
            </label>
          </FormField>

          <FormField
            label="Transaction Alerts"
            hint="Get notified about transaction completions and failures"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.transactionAlerts}
                onChange={(e) => handleNotificationChange('transactionAlerts', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable transaction alerts</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Notification Delivery
        </h3>

        <div className="space-y-4">
          <FormField
            label="Push Notifications"
            hint="Receive notifications even when the app is not active"
          >
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Enable push notifications</span>
              </label>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={requestNotificationPermission}
                  variant="outline"
                  size="sm"
                >
                  Request Permission
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getPermissionStatusText()}
                </span>
              </div>
            </div>
          </FormField>

          <FormField
            label="Sound Notifications"
            hint="Play sound when notifications are received"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.soundEnabled}
                onChange={(e) => handleNotificationChange('soundEnabled', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable notification sounds</span>
            </label>
          </FormField>

          <FormField
            label="Vibration"
            hint="Vibrate device when notifications are received (mobile only)"
          >
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notifications.vibrationEnabled}
                onChange={(e) => handleNotificationChange('vibrationEnabled', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Enable vibration</span>
            </label>
          </FormField>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Test Notifications
        </h3>

        <div className="flex items-center space-x-4">
          <Button
            onClick={testNotification}
            disabled={testingNotification}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {testingNotification ? 'Sending...' : 'Send Test Notification'}
          </Button>

          <Button
            onClick={checkNotificationPermission}
            variant="outline"
            size="sm"
          >
            Check Permission Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Notification Examples
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <p>• &ldquo;Sync completed successfully&rdquo;</p>
            <p>• &ldquo;Low stock: Bhagavad Gita (5 remaining)&rdquo;</p>
            <p>• &ldquo;System update available&rdquo;</p>
            <p>• &ldquo;Transaction #1234 completed&rdquo;</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Privacy & Permissions
          </h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
            <p>• Notifications are sent locally by your device</p>
            <p>• No personal data is sent to external servers</p>
            <p>• You can revoke permissions at any time</p>
            <p>• Browser settings override app settings</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Troubleshooting
        </h4>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <p><strong>Notifications not working?</strong></p>
          <p>1. Check browser notification permissions</p>
          <p>2. Ensure the app is not muted in system settings</p>
          <p>3. Try refreshing the page and testing again</p>
          <p>4. Some browsers block notifications in private/incognito mode</p>
        </div>
      </div>
    </div>
  );
}