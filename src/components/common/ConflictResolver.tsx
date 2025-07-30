"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export interface ConflictData {
  id: string;
  tableName: string;
  localRecord: any;
  cloudRecord: any;
  conflictFields: string[];
  timestamp: Date;
}

interface ConflictResolverProps {
  conflicts: ConflictData[];
  onResolve: (
    conflictId: string,
    resolution: "local" | "cloud" | "merge",
    mergedData?: any
  ) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ConflictResolver({
  conflicts,
  onResolve,
  onClose,
  isOpen,
}: ConflictResolverProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [mergedData, setMergedData] = useState<any>({});
  const [showMergeEditor, setShowMergeEditor] = useState(false);

  const currentConflict = conflicts[currentConflictIndex];

  useEffect(() => {
    if (currentConflict) {
      // Initialize merged data with local record as base
      setMergedData({ ...currentConflict.localRecord });
    }
  }, [currentConflict]);

  if (!currentConflict) {
    return null;
  }

  const handleResolve = (resolution: "local" | "cloud" | "merge") => {
    if (resolution === "merge") {
      onResolve(currentConflict.id, resolution, mergedData);
    } else {
      onResolve(currentConflict.id, resolution);
    }

    // Move to next conflict or close if done
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      onClose();
    }
  };

  const handleFieldMerge = (field: string, source: "local" | "cloud") => {
    const value =
      source === "local"
        ? currentConflict.localRecord[field]
        : currentConflict.cloudRecord[field];

    setMergedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "boolean") return value.toString();
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  const formatTableName = (tableName: string) => {
    return tableName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getFieldDisplayName = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Data Conflicts"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="warning">
              Conflict {currentConflictIndex + 1} of {conflicts.length}
            </Badge>
            <span className="text-sm text-gray-600">
              {formatTableName(currentConflict.tableName)} - ID:{" "}
              {currentConflict.id}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {currentConflict.timestamp.toLocaleString()}
          </div>
        </div>

        {/* Conflict Overview */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Conflict Details</h4>
          <p className="text-sm text-yellow-700">
            This record has been modified both locally and on the server. Please
            choose how to resolve the conflict for each field.
          </p>
          <div className="mt-2 text-xs text-yellow-600">
            Conflicting fields: {currentConflict.conflictFields.join(", ")}
          </div>
        </div>

        {/* Field Comparison */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Field Comparison</h4>

          {currentConflict.conflictFields.map((field) => {
            const localValue = currentConflict.localRecord[field];
            const cloudValue = currentConflict.cloudRecord[field];
            const mergedValue = mergedData[field];

            return (
              <div key={field} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-800">
                    {getFieldDisplayName(field)}
                  </h5>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleFieldMerge(field, "local")}
                      className={
                        mergedValue === localValue
                          ? "bg-blue-50 border-blue-300"
                          : ""
                      }
                    >
                      Use Local
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleFieldMerge(field, "cloud")}
                      className={
                        mergedValue === cloudValue
                          ? "bg-blue-50 border-blue-300"
                          : ""
                      }
                    >
                      Use Cloud
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* Local Value */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium text-blue-800 mb-1">
                      Local Version
                    </div>
                    <div className="text-blue-700 font-mono text-xs break-all">
                      {formatFieldValue(localValue)}
                    </div>
                  </div>

                  {/* Cloud Value */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-medium text-green-800 mb-1">
                      Cloud Version
                    </div>
                    <div className="text-green-700 font-mono text-xs break-all">
                      {formatFieldValue(cloudValue)}
                    </div>
                  </div>

                  {/* Merged Value */}
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="font-medium text-purple-800 mb-1">
                      Selected Value
                    </div>
                    <div className="text-purple-700 font-mono text-xs break-all">
                      {formatFieldValue(mergedValue)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Merge Editor */}
        {showMergeEditor && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              Manual Merge Editor
            </h4>
            <textarea
              value={JSON.stringify(mergedData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setMergedData(parsed);
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full h-64 p-3 border rounded font-mono text-sm"
              placeholder="Edit the merged data as JSON..."
            />
            <div className="mt-2 text-xs text-gray-500">
              Edit the JSON directly for complex merges. Invalid JSON will be
              ignored.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMergeEditor(!showMergeEditor)}
            >
              {showMergeEditor ? "Hide" : "Show"} JSON Editor
            </Button>
            {currentConflictIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentConflictIndex(currentConflictIndex - 1)
                }
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => handleResolve("local")}>
              Use All Local
            </Button>
            <Button variant="outline" onClick={() => handleResolve("cloud")}>
              Use All Cloud
            </Button>
            <Button variant="primary" onClick={() => handleResolve("merge")}>
              Use Merged
            </Button>
          </div>
        </div>

        {/* Skip/Cancel Options */}
        <div className="flex items-center justify-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500"
          >
            Skip Remaining Conflicts
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Hook for managing conflicts
export function useConflictResolver() {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const addConflict = (conflict: ConflictData) => {
    setConflicts((prev) => [...prev, conflict]);
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: "local" | "cloud" | "merge",
    mergedData?: any
  ) => {
    // Remove the resolved conflict
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));

    // Here you would typically call an API to apply the resolution
    console.log("Resolving conflict:", { conflictId, resolution, mergedData });

    // In a real implementation, you would:
    // 1. Apply the resolution to the local database
    // 2. Update the cloud database if needed
    // 3. Update sync metadata
  };

  const clearAllConflicts = () => {
    setConflicts([]);
  };

  return {
    conflicts,
    isResolving,
    addConflict,
    resolveConflict,
    clearAllConflicts,
    hasConflicts: conflicts.length > 0,
  };
}
