'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: 'daily-sales' | 'transactions' | 'products' | 'analytics';
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'pdf';
  recipients: string[];
  filters: Record<string, any>;
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdAt: Date;
}

export function ReportScheduler() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reports/scheduled');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch scheduled reports');
      }

      setScheduledReports(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleReportStatus = async (reportId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update report status');
      }

      setScheduledReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, isActive } : report
        )
      );
    } catch (err) {
      console.error('Error updating report status:', err);
      alert('Failed to update report status');
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/scheduled/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      setScheduledReports(prev => prev.filter(report => report.id !== reportId));
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  };

  const runReportNow = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${reportId}/run`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to run report');
      }

      alert('Report has been queued for generation');
      fetchScheduledReports(); // Refresh to update last run time
    } catch (err) {
      console.error('Error running report:', err);
      alert('Failed to run report');
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  const getReportTypeLabel = (reportType: string) => {
    switch (reportType) {
      case 'daily-sales': return 'Daily Sales';
      case 'transactions': return 'Transaction History';
      case 'products': return 'Product Performance';
      case 'analytics': return 'Sales Analytics';
      default: return reportType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading scheduled reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchScheduledReports} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scheduled Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automate report generation and delivery
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Scheduled Report
        </Button>
      </div>

      {/* Scheduled Reports List */}
      <div className="bg-white rounded-lg border">
        {scheduledReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.name}
                        </div>
                        {report.recipients.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Recipients: {report.recipients.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getReportTypeLabel(report.reportType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getFrequencyLabel(report.frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.format.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(report.nextRun), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => runReportNow(report.id)}
                        >
                          Run Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleReportStatus(report.id, !report.isActive)}
                        >
                          {report.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled reports</h3>
            <p className="text-gray-500 mb-4">
              Create your first scheduled report to automate report generation and delivery.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Scheduled Report
            </Button>
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <CreateScheduledReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchScheduledReports();
          }}
        />
      )}
    </div>
  );
}

// Create Scheduled Report Modal Component
interface CreateScheduledReportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateScheduledReportModal({ onClose, onSuccess }: CreateScheduledReportModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'daily-sales' as const,
    frequency: 'daily' as const,
    format: 'csv' as const,
    recipients: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a report name');
      return;
    }

    try {
      setLoading(true);

      const recipients = formData.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      const response = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          reportType: formData.reportType,
          frequency: formData.frequency,
          format: formData.format,
          recipients,
          filters: {
            startDate: formData.startDate,
            categoryId: formData.categoryId || undefined,
          },
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create scheduled report');
      }

      onSuccess();
    } catch (err) {
      console.error('Error creating scheduled report:', err);
      alert(err instanceof Error ? err.message : 'Failed to create scheduled report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Scheduled Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Daily Sales Summary"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <Select
              value={formData.reportType}
              onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value as any }))}
              options={[
                { value: 'daily-sales', label: 'Daily Sales' },
                { value: 'transactions', label: 'Transaction History' },
                { value: 'products', label: 'Product Performance' },
                { value: 'analytics', label: 'Sales Analytics' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <Select
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <Select
            value={formData.format}
            onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'pdf', label: 'PDF' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Recipients
          </label>
          <Input
            value={formData.recipients}
            onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
            placeholder="email1@example.com, email2@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple email addresses with commas
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}