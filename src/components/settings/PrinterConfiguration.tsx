'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';
import { settingsService } from '@/services/settings/settingsService';

interface PrinterConfigurationProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

const PRINTER_TYPE_OPTIONS = [
  { value: 'thermal', label: 'Thermal Printer' },
  { value: 'pdf', label: 'PDF Generation' },
];

const PAPER_WIDTH_OPTIONS = [
  { value: '58', label: '58mm' },
  { value: '80', label: '80mm' },
  { value: '110', label: '110mm' },
];

export function PrinterConfiguration({ settings, onChange }: PrinterConfigurationProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const handlePrinterChange = (field: keyof SystemSettings['printer'], value: any) => {
    onChange({
      printer: {
        ...settings.printer,
        [field]: value,
      },
    });
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const success = await settingsService.testPrinter();
      if (success) {
        setTestResult('✅ Printer test successful! Test receipt printed.');
      } else {
        setTestResult('❌ Printer test failed. Check connection and settings.');
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleScanDevices = async () => {
    setScanning(true);
    try {
      if ('usb' in navigator) {
        const devices = await (navigator as any).usb.getDevices();
        setAvailableDevices(devices);
      } else {
        setTestResult('❌ Web USB not supported in this browser');
      }
    } catch (error) {
      setTestResult(`❌ Failed to scan devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setScanning(false);
    }
  };

  const handleConnectDevice = async () => {
    try {
      if ('usb' in navigator) {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x04b8 }, // Epson
            { vendorId: 0x0519 }, // Star Micronics
            { vendorId: 0x154f }, // Citizen
          ]
        });
        
        if (device) {
          handlePrinterChange('deviceId', device.serialNumber || device.productName);
          setTestResult('✅ Device connected successfully');
        }
      }
    } catch (error) {
      setTestResult(`❌ Failed to connect device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Printer Enabled"
          helperText="Enable or disable receipt printing"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.printer.enabled}
              onChange={(e) => handlePrinterChange('enabled', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span>Enable receipt printing</span>
          </label>
        </FormField>

        <FormField
          label="Printer Type"
          helperText="Select the type of printer to use"
        >
          <Select
            value={settings.printer.type}
            onChange={(e) => handlePrinterChange('type', e.target.value)}
            options={PRINTER_TYPE_OPTIONS}
            disabled={!settings.printer.enabled}
          />
        </FormField>

        <FormField
          label="Paper Width"
          helperText="Width of the thermal paper in millimeters"
        >
          <Select
            value={settings.printer.paperWidth.toString()}
            onChange={(e) => handlePrinterChange('paperWidth', parseInt(e.target.value))}
            options={PAPER_WIDTH_OPTIONS}
            disabled={!settings.printer.enabled || settings.printer.type !== 'thermal'}
          />
        </FormField>

        <FormField
          label="Character Width"
          helperText="Number of characters per line"
        >
          <Input
            type="number"
            value={settings.printer.characterWidth}
            onChange={(e) => handlePrinterChange('characterWidth', parseInt(e.target.value))}
            min={20}
            max={80}
            disabled={!settings.printer.enabled || settings.printer.type !== 'thermal'}
          />
        </FormField>
      </div>

      {settings.printer.enabled && settings.printer.type === 'thermal' && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Device Connection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Connected Device"
                helperText="Currently connected thermal printer"
              >
                <div className="flex space-x-2">
                  <Input
                    value={settings.printer.deviceId || 'No device connected'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={handleConnectDevice}
                    variant="outline"
                    size="sm"
                  >
                    Connect
                  </Button>
                </div>
              </FormField>

              <FormField
                label="Available Devices"
                helperText="Scan for available USB devices"
              >
                <div className="flex space-x-2">
                  <Button
                    onClick={handleScanDevices}
                    disabled={scanning}
                    variant="outline"
                    size="sm"
                  >
                    {scanning ? 'Scanning...' : 'Scan Devices'}
                  </Button>
                  <span className="text-sm text-gray-500 flex items-center">
                    {availableDevices.length} found
                  </span>
                </div>
              </FormField>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Printer Testing
            </h3>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleTestPrint}
                disabled={testing || !settings.printer.enabled}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {testing ? 'Testing...' : 'Test Print'}
              </Button>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.printer.testPrintEnabled}
                  onChange={(e) => handlePrinterChange('testPrintEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">Enable test printing</span>
              </label>
            </div>

            {testResult && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-mono">{testResult}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
        <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          Thermal Printer Setup
        </h3>
        <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
          <p>• Ensure your thermal printer is connected via USB</p>
          <p>• Grant USB device permissions when prompted</p>
          <p>• Test the connection before processing transactions</p>
          <p>• PDF fallback will be used if thermal printing fails</p>
        </div>
      </div>
    </div>
  );
}