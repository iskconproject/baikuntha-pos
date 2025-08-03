'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';
import { settingsService } from '@/services/settings/settingsService';
import { 
  Printer, 
  FileText, 
  Ruler, 
  Type, 
  Link, 
  Search, 
  TestTube, 
  Lightbulb,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

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
    <div className="space-y-8">
      {/* Basic Configuration */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Basic Configuration
            </h3>
            <p className="text-sm text-gray-600">
              Configure printer type and basic settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <FormField
              label="Printer Enabled"
              hint="Enable or disable receipt printing"
            >
              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.printer.enabled}
                  onChange={(e) => handlePrinterChange('enabled', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
                />
                <div className="flex items-center space-x-2">
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Enable receipt printing</span>
                </div>
              </label>
            </FormField>
          </div>

          <FormField
            label="Printer Type"
            hint="Select the type of printer to use"
          >
            <div className="relative">
              <Select
                value={settings.printer.type}
                onChange={(e) => handlePrinterChange('type', e.target.value)}
                options={PRINTER_TYPE_OPTIONS}
                disabled={!settings.printer.enabled}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
          </FormField>

          <FormField
            label="Paper Width"
            hint="Width of the thermal paper in millimeters"
          >
            <div className="relative">
              <Select
                value={settings.printer.paperWidth.toString()}
                onChange={(e) => handlePrinterChange('paperWidth', parseInt(e.target.value))}
                options={PAPER_WIDTH_OPTIONS}
                disabled={!settings.printer.enabled || settings.printer.type !== 'thermal'}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Ruler className="w-4 h-4" />
              </div>
            </div>
          </FormField>

          <FormField
            label="Character Width"
            hint="Number of characters per line"
          >
            <div className="relative">
              <Input
                type="number"
                value={settings.printer.characterWidth}
                onChange={(e) => handlePrinterChange('characterWidth', parseInt(e.target.value))}
                min={20}
                max={80}
                disabled={!settings.printer.enabled || settings.printer.type !== 'thermal'}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Type className="w-4 h-4" />
              </div>
            </div>
          </FormField>
        </div>
      </div>

      {/* Device Connection Section */}
      {settings.printer.enabled && settings.printer.type === 'thermal' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Link className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Device Connection
              </h3>
              <p className="text-sm text-gray-600">
                Connect and manage thermal printer devices
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <FormField
                label="Connected Device"
                hint="Currently connected thermal printer"
              >
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={settings.printer.deviceId || 'No device connected'}
                      readOnly
                      className="pl-10 bg-white"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {settings.printer.deviceId ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectDevice}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Connect New Device
                  </Button>
                </div>
              </FormField>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <FormField
                label="Available Devices"
                hint="Scan for available USB devices"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium">Devices Found:</span>
                    <span className="text-lg font-bold text-purple-600">
                      {availableDevices.length}
                    </span>
                  </div>
                  <Button
                    onClick={handleScanDevices}
                    disabled={scanning}
                    variant="outline"
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Scan for Devices
                      </>
                    )}
                  </Button>
                </div>
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* Testing Section */}
      {settings.printer.enabled && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <TestTube className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Printer Testing
              </h3>
              <p className="text-sm text-gray-600">
                Test your printer configuration and connectivity
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleTestPrint}
                  disabled={testing || !settings.printer.enabled}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 mr-2" />
                      Test Print
                    </>
                  )}
                </Button>
              </div>

              <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.printer.testPrintEnabled}
                  onChange={(e) => handlePrinterChange('testPrintEnabled', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium">Enable test printing</span>
              </label>
            </div>

            {testResult && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {testResult.includes('✅') ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-mono text-gray-700">
                      {testResult}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-3">
              Thermal Printer Setup Guide
            </h3>
            <div className="space-y-2 text-sm text-yellow-700">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Ensure your thermal printer is connected via USB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Grant USB device permissions when prompted by your browser</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Test the connection before processing customer transactions</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>PDF fallback will be used automatically if thermal printing fails</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}