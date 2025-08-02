"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  errorLogger,
  type ErrorLogEntry,
  type ErrorLogFilter,
} from "@/services/logging/errorLogger";
import { useActionFeedback } from "@/hooks/useActionFeedback";

export function ErrorLogViewer() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filter, setFilter] = useState<ErrorLogFilter>({});
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statistics, setStatistics] = useState(errorLogger.getStatistics());

  const { executeAction, isLoading } = useActionFeedback();

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = () => {
    const filteredLogs = errorLogger.getLogs(filter);
    setLogs(filteredLogs);
    setStatistics(errorLogger.getStatistics());
  };

  const handleResolveLog = async (logId: string) => {
    await executeAction(
      async () => {
        const success = errorLogger.resolveLog(
          logId,
          "admin",
          "Resolved by administrator"
        );
        if (!success) throw new Error("Failed to resolve log");
        loadLogs();
      },
      {
        successMessage: "Log marked as resolved",
        errorMessage: "Failed to resolve log",
      }
    );
  };

  const handleDeleteLog = async (logId: string) => {
    await executeAction(
      async () => {
        const success = errorLogger.deleteLog(logId);
        if (!success) throw new Error("Failed to delete log");
        loadLogs();
      },
      {
        successMessage: "Log deleted successfully",
        errorMessage: "Failed to delete log",
      }
    );
  };

  const handleExportLogs = () => {
    const exportData = errorLogger.exportLogs(filter);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAllLogs = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all logs? This action cannot be undone."
      )
    ) {
      return;
    }

    await executeAction(
      async () => {
        errorLogger.clearLogs();
        loadLogs();
      },
      {
        successMessage: "All logs cleared successfully",
        errorMessage: "Failed to clear logs",
      }
    );
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (level) {
      case "error":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "warning":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "info":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-600">Monitor and manage application errors</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="h-4 w-4" />}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportLogs}
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAllLogs}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">
            {statistics.total}
          </div>
          <div className="text-sm text-gray-600">Total Logs</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">
            {statistics.byLevel.error || 0}
          </div>
          <div className="text-sm text-gray-600">Errors</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">
            {statistics.byLevel.warning || 0}
          </div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {statistics.resolved}
          </div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">
            {statistics.last24Hours}
          </div>
          <div className="text-sm text-gray-600">Last 24h</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search logs..."
              value={filter.search || ""}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Select
              placeholder="Filter by level"
              value={filter.level || ""}
              onChange={(e) =>
                setFilter({ ...filter, level: e.target.value as any })
              }
              options={[
                { value: "", label: "All Levels" },
                { value: "error", label: "Error" },
                { value: "warning", label: "Warning" },
                { value: "info", label: "Info" },
              ]}
            />
            <Select
              placeholder="Filter by status"
              value={filter.resolved?.toString() || ""}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  resolved:
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                })
              }
              options={[
                { value: "", label: "All Status" },
                { value: "false", label: "Unresolved" },
                { value: "true", label: "Resolved" },
              ]}
            />
            <Input
              type="date"
              placeholder="From date"
              value={filter.dateFrom || ""}
              onChange={(e) =>
                setFilter({ ...filter, dateFrom: e.target.value })
              }
              leftIcon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
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
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getLogIcon(log.level)}
                      <span className={`ml-2 ${getLevelBadge(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {log.message}
                    </div>
                    {log.context?.component && (
                      <div className="text-xs text-gray-500">
                        Component: {log.context.component}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.resolved ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Resolved</span>
                      </div>
                    ) : (
                      <span className="text-sm text-red-600">Unresolved</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {!log.resolved && (
                      <button
                        onClick={() => handleResolveLog(log.id)}
                        className="text-green-600 hover:text-green-900"
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No logs found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No error logs match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Error Log Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getLogIcon(selectedLog.level)}
                <span className={`ml-2 ${getLevelBadge(selectedLog.level)}`}>
                  {selectedLog.level.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-500">ID: {selectedLog.id}</div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Message</h4>
              <p className="mt-1 text-sm text-gray-600">
                {selectedLog.message}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Timestamp</h4>
              <p className="mt-1 text-sm text-gray-600">
                {formatTimestamp(selectedLog.timestamp)}
              </p>
            </div>

            {selectedLog.error && (
              <div>
                <h4 className="font-medium text-gray-900">Error Details</h4>
                <div className="mt-1 bg-gray-50 rounded-md p-3">
                  <div className="text-sm">
                    <div>
                      <strong>Name:</strong> {selectedLog.error.name}
                    </div>
                    <div>
                      <strong>Message:</strong> {selectedLog.error.message}
                    </div>
                    {selectedLog.error.code && (
                      <div>
                        <strong>Code:</strong> {selectedLog.error.code}
                      </div>
                    )}
                    {selectedLog.error.statusCode && (
                      <div>
                        <strong>Status:</strong> {selectedLog.error.statusCode}
                      </div>
                    )}
                  </div>
                  {selectedLog.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                        {selectedLog.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {selectedLog.context && (
              <div>
                <h4 className="font-medium text-gray-900">Context</h4>
                <div className="mt-1 bg-gray-50 rounded-md p-3">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedLog.resolved && (
              <div>
                <h4 className="font-medium text-gray-900">Resolution</h4>
                <div className="mt-1 text-sm text-gray-600">
                  <div>Resolved by: {selectedLog.resolvedBy}</div>
                  <div>
                    Resolved at: {formatTimestamp(selectedLog.resolvedAt!)}
                  </div>
                  {selectedLog.notes && <div>Notes: {selectedLog.notes}</div>}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {!selectedLog.resolved && (
                <Button
                  onClick={() => {
                    handleResolveLog(selectedLog.id);
                    setSelectedLog(null);
                  }}
                  icon={<CheckCircle className="h-4 w-4" />}
                >
                  Mark as Resolved
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedLog(null)}
                icon={<X className="h-4 w-4" />}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
