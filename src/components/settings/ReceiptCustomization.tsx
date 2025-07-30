'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SystemSettings } from '@/types/settings';

interface ReceiptCustomizationProps {
  settings: SystemSettings;
  onChange: (updates: Partial<SystemSettings>) => void;
}

export function ReceiptCustomization({ settings, onChange }: ReceiptCustomizationProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleReceiptChange = (field: keyof SystemSettings['receipt'], value: any) => {
    onChange({
      receipt: {
        ...settings.receipt,
        [field]: value,
      },
    });
  };

  const handleContactInfoChange = (field: keyof SystemSettings['receipt']['contactInfo'], value: string) => {
    onChange({
      receipt: {
        ...settings.receipt,
        contactInfo: {
          ...settings.receipt.contactInfo,
          [field]: value,
        },
      },
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleReceiptChange('logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePreview = () => {
    return `
${settings.receipt.header}
${'='.repeat(48)}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Cashier: Demo User

ITEMS:
Bhagavad Gita                   ₹250.00
Tulsi Mala                      ₹150.00
                               --------
Subtotal:                       ₹400.00
Tax:                             ₹72.00
                               --------
TOTAL:                          ₹472.00

Payment: Cash
Change:                          ₹28.00

${'='.repeat(48)}
${settings.receipt.footer}

${settings.receipt.contactInfo.address}
${settings.receipt.contactInfo.phone}
${settings.receipt.contactInfo.email}
${settings.receipt.contactInfo.website || ''}
    `.trim();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receipt Content */}
        <div className="space-y-6">
          <FormField
            label="Receipt Header"
            description="Text displayed at the top of receipts"
          >
            <textarea
              value={settings.receipt.header}
              onChange={(e) => handleReceiptChange('header', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter receipt header text..."
            />
          </FormField>

          <FormField
            label="Receipt Footer"
            description="Text displayed at the bottom of receipts"
          >
            <textarea
              value={settings.receipt.footer}
              onChange={(e) => handleReceiptChange('footer', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter receipt footer text..."
            />
          </FormField>

          <FormField
            label="Logo"
            description="Upload a logo image for receipts (optional)"
          >
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {settings.receipt.logo && (
                <div className="mt-2">
                  <img
                    src={settings.receipt.logo}
                    alt="Receipt Logo"
                    className="max-w-32 max-h-16 object-contain border rounded"
                  />
                  <Button
                    onClick={() => handleReceiptChange('logo', undefined)}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 border-red-600"
                  >
                    Remove Logo
                  </Button>
                </div>
              )}
            </div>
          </FormField>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Contact Information
            </h3>

            <FormField label="Address">
              <textarea
                value={settings.receipt.contactInfo.address}
                onChange={(e) => handleContactInfoChange('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Phone">
                <Input
                  value={settings.receipt.contactInfo.phone}
                  onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                />
              </FormField>

              <FormField label="Email">
                <Input
                  type="email"
                  value={settings.receipt.contactInfo.email}
                  onChange={(e) => handleContactInfoChange('email', e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Website (Optional)">
              <Input
                type="url"
                value={settings.receipt.contactInfo.website || ''}
                onChange={(e) => handleContactInfoChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Additional Options
            </h3>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.receipt.showQR}
                  onChange={(e) => handleReceiptChange('showQR', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Include QR code for digital receipt</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.receipt.showBarcode}
                  onChange={(e) => handleReceiptChange('showBarcode', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Include barcode for transaction ID</span>
              </label>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Receipt Preview
            </h3>
            <Button
              onClick={() => setPreviewMode(!previewMode)}
              variant="outline"
              size="sm"
            >
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {previewMode && (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="font-mono text-xs whitespace-pre-line text-center bg-gray-50 p-4 rounded border">
                {generatePreview()}
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Receipt Tips
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
              <p>• Keep header and footer text concise for thermal printers</p>
              <p>• Logo should be high contrast and simple for best printing</p>
              <p>• Contact information appears at the bottom of every receipt</p>
              <p>• QR codes can link to digital receipt or feedback forms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}