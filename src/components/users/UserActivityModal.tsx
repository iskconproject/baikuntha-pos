'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

interface User {
  id: string;
  username: string;
  role: UserRole;
}

interface ActivityEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  targetUserId?: string;
  targetUsername?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

interface UserActivityModalProps {
  user: User;
  onClose: () => void;
}

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'create_user', label: 'Create User' },
  { value: 'update_user', label: 'Update User' },
  { value: 'deactivate_user', label: 'Deactivate User' },
  { value: 'reactivate_user', label: 'Reactivate User' },
  { value: 'change_pin', label: 'Change PIN' },
];

const getActionColor = (action: string) => {
  switch (action) {
    case 'login':
      return 'bg-green-100 text-green-800';
    case 'create_user':
      return 'bg-blue-100 text-blue-800';
    case 'update_user':
      return 'bg-yellow-100 text-yellow-800';
    case 'deactivate_user':
      return 'bg-red-100 text-red-800';
    case 'reactivate_user':
      return 'bg-green-100 text-green-800';
    case 'change_pin':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'login':
      return 'Login';
    case 'create_user':
      return 'Created User';
    case 'update_user':
      return 'Updated User';
    case 'deactivate_user':
      return 'Deactivated User';
    case 'reactivate_user':
      return 'Reactivated User';
    case 'change_pin':
      return 'Changed PIN';
    default:
      return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export const UserActivityModal: React.FC<UserActivityModalProps> = ({
  user,
  onClose,
}) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '50',
      });
      
      if (actionFilter) {
        params.append('action', actionFilter);
      }
      
      const response = await fetch(`/api/users/${user.id}/activity?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }
      
      const data = await response.json();
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user.id, actionFilter]);

  useEffect(() => {
    fetchActivities();
  }, [user.id, actionFilter, fetchActivities]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Activity Log - ${user.username}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex justify-between items-center">
          <Select
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-48"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchActivities}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Activity list */}
        <div className="max-h-96 overflow-y-auto">
          {loading && activities.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No activity found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(activity.action)}`}>
                          {getActionLabel(activity.action)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        {activity.targetUsername && (
                          <p>
                            <span className="font-medium">Target:</span> {activity.targetUsername}
                          </p>
                        )}
                        
                        {activity.details && (
                          <div className="mt-2">
                            <span className="font-medium">Details:</span>
                            <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                              {JSON.stringify(activity.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {activity.ipAddress && (
                          <p className="mt-1 text-xs text-gray-500">
                            IP: {activity.ipAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};