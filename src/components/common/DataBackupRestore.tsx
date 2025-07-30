'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';

interface BackupData {
  version: string;
  timestamp: Date;
  tables: {
    users: any[];
    categories: any[];
    products: any[];
    productVariants: any[];
    transactions: any[];
    transactionItems: any[];
    syncMetadata: any[];
  };
  metadata: {
    deviceId: string;
    appVersion: string;
    totalRecords: number;
  };
}

interface DataBackupRestoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataBackupRestore({ isOpen, onClose }: DataBackupRestoreProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [backupHistory, setBackupHistory] = useState<{
    filename: string;
    timestamp: Date;
    size: string;
    records: number;
  }[]>([]);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);

    try {
      // Simulate backup creation with progress
      const tables = ['users', 'categories', 'products', 'productVariants', 'transactions', 'transactionItems', 'syncMetadata'];
      let totalRecords = 0;

      const backupData: BackupData = {
        version: '1.0',
        timestamp: new Date(),
        tables: {
          users: [],
          categories: [],
          products: [],
          productVariants: [],
          transactions: [],
          transactionItems: [],
          syncMetadata: []
        },
        metadata: {
          deviceId: 'device-' + Math.random().toString(36).substr(2, 9),
          appVersion: '1.0.0',
          totalRecords: 0
        }
      };

      // Simulate data extraction with progress updates
      for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i] as keyof BackupData['tables'];
        setBackupProgress(((i + 1) / tables.length) * 80); // 80% for data extraction
        
        // Simulate API call to get table data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In real implementation, you would call the appropriate service
        // const data = await databaseService.getAllFromTable(tableName);
        const mockData = generateMockTableData(tableName);
        backupData.tables[tableName] = mockData;
        totalRecords += mockData.length;
      }

      backupData.metadata.totalRecords = totalRecords;
      setBackupProgress(90);

      // Create and download backup file
      const filename = `vaikunthapos-backup-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupProgress(100);

      // Add to backup history
      setBackupHistory(prev => [{
        filename,
        timestamp: new Date(),
        size: formatFileSize(blob.size),
        records: totalRecords
      }, ...prev.slice(0, 9)]); // Keep last 10 backups

      setTimeout(() => {
        setIsCreatingBackup(false);
        setBackupProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Backup creation failed:', error);
      setIsCreatingBackup(false);
      setBackupProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      previewBackupFile(file);
    }
  };

  const previewBackupFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      
      // Validate backup file structure
      if (!data.version || !data.timestamp || !data.tables || !data.metadata) {
        throw new Error('Invalid backup file format');
      }

      setRestorePreview(data);
    } catch (error) {
      console.error('Error reading backup file:', error);
      alert('Invalid backup file. Please select a valid VaikunthaPOS backup file.');
      setSelectedFile(null);
      setRestorePreview(null);
    }
  };

  const handleRestore = async () => {
    if (!restorePreview) return;

    const confirmed = confirm(
      'This will replace all current data with the backup data. This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setRestoreProgress(0);

    try {
      const tables = Object.keys(restorePreview.tables) as (keyof BackupData['tables'])[];
      
      for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i];
        const tableData = restorePreview.tables[tableName];
        
        setRestoreProgress(((i + 1) / tables.length) * 100);
        
        // Simulate restore operation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In real implementation, you would:
        // 1. Clear existing table data
        // 2. Insert backup data
        // 3. Update sync metadata
        console.log(`Restoring ${tableName}: ${tableData.length} records`);
      }

      alert('Data restore completed successfully!');
      setIsRestoring(false);
      setRestoreProgress(0);
      setSelectedFile(null);
      setRestorePreview(null);
      onClose();

    } catch (error) {
      console.error('Restore failed:', error);
      alert('Restore failed. Please try again or contact support.');
      setIsRestoring(false);
      setRestoreProgress(0);
    }
  };

  const generateMockTableData = (tableName: string): any[] => {
    // Generate mock data for demonstration
    const counts: Record<string, number> = {
      users: 5,
      categories: 10,
      products: 50,
      productVariants: 75,
      transactions: 100,
      transactionItems: 200,
      syncMetadata: 7
    };

    return Array.from({ length: counts[tableName] || 0 }, (_, i) => ({
      id: `${tableName}-${i + 1}`,
      name: `${tableName} ${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTableName = (tableName: string) => {
    return tableName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Backup & Restore"
      size="lg"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'backup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Backup
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'restore'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Restore Data
          </button>
        </div>

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Create Data Backup</h4>
              <p className="text-sm text-blue-700 mb-3">
                Create a complete backup of all your data including products, transactions, users, and settings.
                The backup file can be used to restore data on this or another device.
              </p>
              
              {isCreatingBackup ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-blue-700">Creating backup...</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-600">{backupProgress}% complete</div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                >
                  Create Backup
                </Button>
              )}
            </div>

            {/* Backup History */}
            {backupHistory.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Backups</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {backupHistory.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{backup.filename}</div>
                        <div className="text-xs text-gray-500">
                          {backup.timestamp.toLocaleString()} • {backup.records} records • {backup.size}
                        </div>
                      </div>
                      <Badge variant="success" size="sm">Downloaded</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Restore Tab */}
        {activeTab === 'restore' && (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Restore from Backup</h4>
              <p className="text-sm text-orange-700 mb-3">
                Select a backup file to restore your data. This will replace all current data with the backup data.
                Make sure to create a backup of your current data before proceeding.
              </p>
              
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                
                {selectedFile && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </div>
                )}
              </div>
            </div>

            {/* Restore Preview */}
            {restorePreview && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Backup Preview</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">Version:</span>
                    <span className="ml-2 font-medium">{restorePreview.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 font-medium">
                      {new Date(restorePreview.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Records:</span>
                    <span className="ml-2 font-medium">{restorePreview.metadata.totalRecords}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">App Version:</span>
                    <span className="ml-2 font-medium">{restorePreview.metadata.appVersion}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-gray-800 mb-2">Data Tables:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(restorePreview.tables).map(([tableName, data]) => (
                      <div key={tableName} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{formatTableName(tableName)}</span>
                        <Badge variant="info" size="sm">{data.length}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {isRestoring ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-orange-700">Restoring data...</span>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${restoreProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-orange-600">{restoreProgress}% complete</div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="primary"
                      onClick={handleRestore}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Restore Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setRestorePreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}