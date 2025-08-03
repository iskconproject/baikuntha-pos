"use client";

import { useState, useEffect } from "react";
import { receiptService } from "@/services/printer/receiptService";
import { settingsService } from "@/services/settings/settingsService";
import type { ReceiptData, PrintResult } from "@/types/receipt";
import type { SystemSettings } from "@/types/settings";

interface ReceiptPrinterProps {
  receiptData: ReceiptData;
  onPrintComplete: (result: PrintResult) => void;
  onClose: () => void;
  className?: string;
}

export function ReceiptPrinter({
  receiptData,
  onPrintComplete,
  onClose,
  className = "",
}: ReceiptPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load printer settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const systemSettings = await settingsService.getSettings();
        setSettings(systemSettings);
      } catch (error) {
        console.error("Failed to load printer settings:", error);
        setError("Failed to load printer settings");
      }
    };

    loadSettings();
  }, []);

  const handlePrint = async () => {
    if (!settings) {
      setError("Printer settings not loaded");
      return;
    }

    if (!settings.printer.enabled) {
      setError("Printer is disabled in settings");
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      // Print the receipt using configured settings
      const result = await receiptService.printReceipt(receiptData);

      if (result.success) {
        onPrintComplete(result);
      } else {
        setError(result.error || "Print failed");
      }
    } catch (error) {
      console.error("Print failed:", error);
      setError(error instanceof Error ? error.message : "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const getPrintButtonText = () => {
    if (isPrinting) return "Printing...";
    if (!settings) return "Loading...";
    return `Print Receipt (${settings.printer.type.toUpperCase()})`;
  };

  const canPrint = () => {
    return settings && settings.printer.enabled && !isPrinting;
  };

  if (!settings) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Receipt Printer
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">
                Loading printer settings...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Print Receipt
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Printer Status Display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-3 ${
                    settings.printer.enabled ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Printer: {settings.printer.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <div className="text-xs text-gray-500">
                    Type: {settings.printer.type.toUpperCase()}
                    {settings.printer.type === "thermal" && (
                      <span> • {settings.printer.paperWidth}mm paper</span>
                    )}
                  </div>
                </div>
              </div>
              {!settings.printer.enabled && (
                <span className="text-xs text-gray-500">
                  Configure in Settings
                </span>
              )}
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Receipt Preview
            </h3>
            <div className="bg-white p-3 rounded border text-xs font-mono">
              <div className="text-center mb-2">
                <div className="font-bold">{receiptData.storeName}</div>
                <div>{receiptData.storeAddress}</div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span>{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {new Date(receiptData.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              {receiptData.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate mr-2">{item.name}</span>
                  <span>₹{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
              {receiptData.items.length > 3 && (
                <div className="text-center text-gray-500">
                  ... and {receiptData.items.length - 3} more items
                </div>
              )}
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>₹{receiptData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={!canPrint()}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {getPrintButtonText()}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Print Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {!settings.printer.enabled && (
                    <p className="text-sm text-red-700 mt-1">
                      Please enable and configure the printer in Settings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
