'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThermalPrinter } from '@/services/printer/thermalPrinter';

export interface PrinterStatus {
  isConnected: boolean;
  isConnecting: boolean;
  printerName: string | null;
  error: string | null;
  isSupported: boolean;
  lastConnected: Date | null;
}

export function usePrinterStatus() {
  const [status, setStatus] = useState<PrinterStatus>({
    isConnected: false,
    isConnecting: false,
    printerName: null,
    error: null,
    isSupported: ThermalPrinter.isSupported(),
    lastConnected: null,
  });

  const [printer, setPrinter] = useState<ThermalPrinter | null>(null);

  // Initialize printer instance
  useEffect(() => {
    const printerInstance = new ThermalPrinter();
    setPrinter(printerInstance);

    // Check for previously connected printers
    checkExistingConnection();

    return () => {
      if (printerInstance.isReady()) {
        printerInstance.disconnect();
      }
    };
  }, []);

  // Check if there are any previously connected printers
  const checkExistingConnection = useCallback(async () => {
    if (!ThermalPrinter.isSupported()) {
      setStatus(prev => ({
        ...prev,
        error: 'Web USB not supported in this browser. Please use Chrome, Edge, or Opera.',
      }));
      return;
    }

    try {
      const connectedPrinters = await ThermalPrinter.getConnectedPrinters();
      if (connectedPrinters.length > 0) {
        setStatus(prev => ({
          ...prev,
          printerName: `USB Printer (${connectedPrinters[0].vendorId}:${connectedPrinters[0].productId})`,
          lastConnected: new Date(),
        }));
      }
    } catch (error) {
      console.error('Error checking existing printers:', error);
    }
  }, []);

  // Connect to printer
  const connect = useCallback(async (): Promise<boolean> => {
    if (!printer || !ThermalPrinter.isSupported()) {
      setStatus(prev => ({
        ...prev,
        error: 'Printer not available or Web USB not supported',
      }));
      return false;
    }

    setStatus(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const success = await printer.connect();
      
      if (success) {
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          printerName: 'Thermal Printer',
          lastConnected: new Date(),
          error: null,
        }));

        // Store connection info in localStorage
        localStorage.setItem('printer_last_connected', new Date().toISOString());
        
        return true;
      } else {
        throw new Error('Failed to connect to printer');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [printer]);

  // Disconnect from printer
  const disconnect = useCallback(async () => {
    if (!printer) return;

    try {
      await printer.disconnect();
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        printerName: null,
        error: null,
      }));
    } catch (error) {
      console.error('Error disconnecting printer:', error);
    }
  }, [printer]);

  // Test printer connection
  const testPrint = useCallback(async (): Promise<boolean> => {
    if (!printer || !status.isConnected) {
      setStatus(prev => ({
        ...prev,
        error: 'Printer not connected',
      }));
      return false;
    }

    try {
      const result = await printer.printTest();
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          error: null,
        }));
        return true;
      } else {
        setStatus(prev => ({
          ...prev,
          error: result.error || 'Test print failed',
        }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test print failed';
      setStatus(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, [printer, status.isConnected]);

  // Clear error
  const clearError = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Get printer instance for direct use
  const getPrinter = useCallback(() => {
    return printer;
  }, [printer]);

  return {
    status,
    connect,
    disconnect,
    testPrint,
    clearError,
    getPrinter,
  };
}