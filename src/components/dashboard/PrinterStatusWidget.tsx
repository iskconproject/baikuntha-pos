'use client';

import { usePrinterStatus } from '@/hooks/usePrinterStatus';
import { PrinterConnectionModal } from '@/components/common/PrinterConnectionModal';
import { useState } from 'react';

interface PrinterStatusWidgetProps {
  className?: string;
}

export function PrinterStatusWidget({ className = '' }: PrinterStatusWidgetProps) {
  const { status, connect, disconnect, testPrint, clearError } = usePrinterStatus();
  const [showModal, setShowModal] = useState(false);

  const getStatusBadge = () => {
    if (status.isConnecting) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <div className="animate-spin h-3 w-3 border border-yellow-600 border-t-transparent rounded-full mr-1.5" />
          Connecting
        </span>
      );
    }

    if (status.isConnected) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Connected
        </span>
      );
    }

    if (status.error) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Error
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
        </svg>
        Disconnected
      </span>
    );
  };

  const getActionButton = () => {
    if (!status.isSupported) {
      return (
        <span className="text-xs text-gray-500">
          Not supported in this browser
        </span>
      );
    }

    if (status.isConnected) {
      return (
        <button
          onClick={() => setShowModal(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Manage
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
      >
        Connect
      </button>
    );
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Thermal Printer</h3>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge()}
                {getActionButton()}
              </div>
            </div>
          </div>
        </div>

        {status.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {status.error}
          </div>
        )}

        {status.isConnected && status.lastConnected && (
          <div className="mt-2 text-xs text-gray-500">
            Connected: {status.lastConnected.toLocaleString()}
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {showModal && (
        <PrinterConnectionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
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