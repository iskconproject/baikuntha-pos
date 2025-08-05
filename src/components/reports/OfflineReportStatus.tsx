'use client';

import { reportManager } from '@/services/reports/reportManager';

interface ReportStatusProps {
  isOnline: boolean;
}

export function ReportStatus({ isOnline }: ReportStatusProps) {
  const status = reportManager.getSystemStatus();

  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg border p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Report Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span className="text-xs text-gray-500">
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          {status.message}
        </div>

        <div className="text-xs text-gray-500">
          {status.isOnline ? 'Real-time data available from Turso database' : 'Internet connection required for reports'}
        </div>

        {!status.isOnline && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Offline:</strong> Connect to the internet to generate reports with current data from the Turso database.
          </div>
        )}
      </div>
    </div>
  );
}

// Keep the old export name for backward compatibility
export { ReportStatus as OfflineReportStatus };