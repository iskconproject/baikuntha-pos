'use client';

import { useState } from 'react';
import type { PrinterStatus } from '@/hooks/usePrinterStatus';

interface PrinterConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: PrinterStatus;
  onConnect: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
  onTestPrint: () => Promise<boolean>;
  onClearError: () => void;
}

export function PrinterConnectionModal({
  isOpen,
  onClose,
  status,
  onConnect,
  onDisconnect,
  onTestPrint,
  onClearError,
}: PrinterConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setTestResult(null);
    onClearError();
    
    try {
      const success = await onConnect();
      if (success) {
        setTestResult('✅ Connected successfully!');
      }
    } catch (error) {
      setTestResult('❌ Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const success = await onTestPrint();
      if (success) {
        setTestResult('✅ Test print successful!');
      } else {
        setTestResult('❌ Test print failed');
      }
    } catch (error) {
      setTestResult('❌ Test print failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    await onDisconnect();
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
              </svg>
              Thermal Printer
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Display */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-4 h-4 rounded-full ${
                status.isConnected ? 'bg-green-500' : 
                status.error ? 'bg-red-500' : 
                'bg-gray-400'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {status.isConnected ? 'Connected' : 
                   status.error ? 'Error' : 
                   'Disconnected'}
                </div>
                {status.printerName && (
                  <div className="text-sm text-gray-600">{status.printerName}</div>
                )}
                {status.lastConnected && (
                  <div className="text-xs text-gray-500">
                    Last connected: {status.lastConnected.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Browser Support Check */}
          {!status.isSupported && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Browser Not Supported</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Thermal printing requires Chrome, Edge, or Opera browser with Web USB support.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {status.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Connection Error</h4>
                  <p className="text-sm text-red-700 mt-1">{status.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          {!status.isConnected && status.isSupported && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Connect your thermal printer via USB</li>
                <li>Click "Connect Printer" below</li>
                <li>Select your printer from the browser dialog</li>
                <li>Grant permission to access the device</li>
                <li>Test the connection</li>
              </ol>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-900">{testResult}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!status.isConnected ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !status.isSupported}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isConnecting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Connecting...
                    </div>
                  ) : (
                    'Connect Printer'
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Disconnect
                </button>
                <button
                  onClick={handleTestPrint}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isTesting ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Testing...
                    </div>
                  ) : (
                    'Test Print'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
                >
                  Done
                </button>
              </>
            )}
          </div>

          {/* Supported Printers Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <details className="text-sm">
              <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                Supported Printer Models
              </summary>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>• Epson TM-T20, TM-T82, TM-T88 series</div>
                <div>• Star Micronics TSP100, TSP650 series</div>
                <div>• Citizen CT-S310, CT-S4000 series</div>
                <div>• Most ESC/POS compatible thermal printers</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}