'use client';

import { useState, useEffect } from 'react';
import { receiptService } from '@/services/printer/receiptService';
import { ThermalPrinter } from '@/services/printer/thermalPrinter';
import type { ReceiptData, PrintResult, PrinterConfig } from '@/types/receipt';

interface ReceiptPrinterProps {
  receiptData: ReceiptData;
  onPrintComplete: (result: PrintResult) => void;
  onClose: () => void;
  className?: string;
}

type PrintType = 'thermal' | 'pdf';

export function ReceiptPrinter({ 
  receiptData, 
  onPrintComplete, 
  onClose, 
  className = '' 
}: ReceiptPrinterProps) {
  const [printType, setPrintType] = useState<PrintType>('thermal');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [thermalConfig, setThermalConfig] = useState({
    width: 32,
    cutPaper: true,
    openDrawer: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Check thermal printer support on mount
  useEffect(() => {
    const isSupported = ThermalPrinter.isSupported();
    if (!isSupported) {
      setPrintType('pdf');
      setError('Thermal printing requires Chrome or Edge browser with Web USB support. Please switch to PDF printing or use a supported browser.');
    }
  }, []);

  // Check if thermal printer is ready
  useEffect(() => {
    if (printType === 'thermal') {
      const isReady = receiptService.isThermalPrinterReady();
      setPrinterStatus(isReady ? 'connected' : 'disconnected');
    }
  }, [printType]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await receiptService.connectThermalPrinter();
      setPrinterStatus('connected');
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      setPrinterStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to connect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    setError(null);

    try {
      const result = await receiptService.testPrinter();
      if (!result.success) {
        setError(result.error || 'Test print failed');
      }
    } catch (error) {
      console.error('Test print failed:', error);
      setError(error instanceof Error ? error.message : 'Test print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setError(null);

    try {
      // Update printer configuration
      const config: PrinterConfig = {
        type: printType,
        thermalConfig: printType === 'thermal' ? thermalConfig : undefined,
      };

      receiptService.updateConfig(config);

      // Print the receipt
      const result = await receiptService.printReceipt(receiptData);
      
      if (result.success) {
        onPrintComplete(result);
      } else {
        setError(result.error || 'Print failed');
      }
    } catch (error) {
      console.error('Print failed:', error);
      setError(error instanceof Error ? error.message : 'Print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setThermalConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getPrintButtonText = () => {
    if (isPrinting) return 'Printing...';
    return `Print Receipt (${printType.toUpperCase()})`;
  };

  const canPrint = () => {
    if (printType === 'pdf') return true;
    return printerStatus === 'connected';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Receipt Printer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Print Method Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Print Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  printType === 'thermal'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="printType"
                    value="thermal"
                    checked={printType === 'thermal'}
                    onChange={(e) => setPrintType(e.target.value as PrintType)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <span className="font-medium">Thermal Printer</span>
                  </div>
                </label>

                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  printType === 'pdf'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="printType"
                    value="pdf"
                    checked={printType === 'pdf'}
                    onChange={(e) => setPrintType(e.target.value as PrintType)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-medium">PDF Download</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Thermal Printer Settings */}
            {printType === 'thermal' && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Thermal Printer Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paper Width (characters)
                    </label>
                    <input
                      type="number"
                      min="24"
                      max="48"
                      value={thermalConfig.width}
                      onChange={(e) => handleConfigChange('width', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={thermalConfig.cutPaper}
                        onChange={(e) => handleConfigChange('cutPaper', e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Cut Paper</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={thermalConfig.openDrawer}
                        onChange={(e) => handleConfigChange('openDrawer', e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Open Drawer</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Printer Status */}
          {printType === 'thermal' && (
            <div className="mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    printerStatus === 'connected' ? 'bg-green-500' :
                    printerStatus === 'error' ? 'bg-red-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    Printer Status: {
                      printerStatus === 'connected' ? 'Connected' :
                      printerStatus === 'error' ? 'Error' : 'Disconnected'
                    }
                  </span>
                </div>
                {printerStatus !== 'connected' && (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {printType === 'thermal' && (
              <button
                onClick={handleTestPrint}
                disabled={isPrinting || printerStatus !== 'connected'}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Test Print
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={isPrinting || !canPrint()}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 font-medium"
            >
              {getPrintButtonText()}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    {printType === 'thermal' ? 'Printer Error' : 'Browser Not Supported'}
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}