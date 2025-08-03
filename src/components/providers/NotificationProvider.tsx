'use client';

import { useNotificationStore } from '@/stores/notificationStore';
import { Toast } from '@/components/ui/Toast';

export function NotificationProvider() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          title={notification.message}
          type={notification.type as 'success' | 'error' | 'warning' | 'info'}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}