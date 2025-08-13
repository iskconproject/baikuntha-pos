'use client';

import { useState } from 'react';
import { usePrinterStatus } from '@/hooks/usePrinterStatus';
import { PrinterConnectionModal } from './PrinterConnectionModal';

interface PrinterStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PrinterStatusIndicator({ 
  className = '', 
  showLabel = true,
  size = 'md' 
}: PrinterStatusIndicatorProps) {
  const { status, connect, disconnect, testPrint, clearError } = usePrinterStatus();
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const getStatusColor = () => {
    if (status.isConnecting) return 'bg-yellow-500';
    if (status.isConnected) return 'bg-green-500';
    if (status.error) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (status.isConnecting) return 'Connecting...';
    if (status.isConnected) return 'Printer Connected';
    if (status.error) return 'Printer Error';
    if (!status.isSupported) return 'Not Supported';
    return 'Printer Disconnected';
  };

  const getStatusIcon = () => {
    if (status.isConnecting) {
      return (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      );
    }

    if (status.isConnected) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (status.error) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
      </svg>
    );
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6';
      case 'lg':
        return 'w-10 h-10';
      default:
        return 'w-8 h-8';
    }
  };

  const handleClick = () => {
    if (status.isConnected) {
      // Show options menu for connected printer
      setShowConnectionModal(true);
    } else if (status.isSupported) {
      // Try to connect
      setShowConnectionModal(true);
    }
  };

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={handleClick}
          disabled={status.isConnecting || !status.isSupported}
          className={`
            ${getSizeClasses()} 
            ${getStatusColor()} 
            rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
            ${status.isSupported ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
          `}
          title={getStatusText()}
        >
          {getStatusIcon()}
        </button>

        {showLabel && (
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${
              status.isConnected ? 'text-green-700' : 
              status.error ? 'text-red-700' : 
              'text-gray-700'
            }`}>
              {getStatusText()}
            </span>
            {status.printerName && (
              <span className="text-xs text-gray-500">{status.printerName}</span>
            )}
            {status.error && (
              <span className="text-xs text-red-600 truncate max-w-48" title={status.error}>
                {status.error}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <PrinterConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          status={status}
          onConnect={connect}
          onDisconnect={disconnect}
          onTestPrint={testPrint}
          onClearError={clearError}
        />
      )}
    </>
  );
}