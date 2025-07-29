import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThermalPrinter } from '@/services/printer/thermalPrinter';

// Mock Web USB API
const mockUSBDevice = {
  vendorId: 0x04b8,
  productId: 0x0202,
  configuration: {
    interfaces: [{
      alternates: [{
        endpoints: [{
          direction: 'out',
          endpointNumber: 1,
          packetSize: 64
        }]
      }]
    }]
  },
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  selectConfiguration: vi.fn().mockResolvedValue(undefined),
  claimInterface: vi.fn().mockResolvedValue(undefined),
  releaseInterface: vi.fn().mockResolvedValue(undefined),
  transferOut: vi.fn().mockResolvedValue({ status: 'ok' })
};

const mockNavigatorUSB = {
  requestDevice: vi.fn().mockResolvedValue(mockUSBDevice),
  getDevices: vi.fn().mockResolvedValue([mockUSBDevice])
};

// Mock navigator.usb
Object.defineProperty(global, 'navigator', {
  value: {
    usb: mockNavigatorUSB
  },
  writable: true
});

describe('ThermalPrinter', () => {
  let printer: ThermalPrinter;

  beforeEach(() => {
    printer = new ThermalPrinter();
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when Web USB is supported', () => {
      expect(ThermalPrinter.isSupported()).toBe(true);
    });

    it('should return false when Web USB is not supported', () => {
      const originalNavigator = global.navigator;
      
      // Mock navigator without USB support
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      expect(ThermalPrinter.isSupported()).toBe(false);

      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      });
    });
  });

  describe('connect', () => {
    it('should connect to thermal printer successfully', async () => {
      const result = await printer.connect();

      expect(result).toBe(true);
      expect(printer.isReady()).toBe(true);
      expect(mockNavigatorUSB.requestDevice).toHaveBeenCalled();
      expect(mockUSBDevice.open).toHaveBeenCalled();
      expect(mockUSBDevice.selectConfiguration).toHaveBeenCalledWith(1);
      expect(mockUSBDevice.claimInterface).toHaveBeenCalledWith(0);
    });

    it('should connect with specific vendor/product ID', async () => {
      const config = {
        vendorId: 0x1234,
        productId: 0x5678,
        width: 32
      };

      await printer.connect(config);

      expect(mockNavigatorUSB.requestDevice).toHaveBeenCalledWith({
        filters: [{ vendorId: 0x1234, productId: 0x5678 }]
      });
    });

    it('should handle connection failure', async () => {
      mockNavigatorUSB.requestDevice.mockRejectedValueOnce(new Error('No device selected'));

      await expect(printer.connect()).rejects.toThrow('No device selected');
      expect(printer.isReady()).toBe(false);
    });

    it('should handle device selection cancellation', async () => {
      mockNavigatorUSB.requestDevice.mockResolvedValueOnce(null);

      await expect(printer.connect()).rejects.toThrow('No printer device selected');
      expect(printer.isReady()).toBe(false);
    });

    it('should handle device already configured', async () => {
      const configuredDevice = {
        ...mockUSBDevice,
        configuration: { interfaces: [{ alternates: [{ endpoints: [] }] }] }
      };
      
      mockNavigatorUSB.requestDevice.mockResolvedValueOnce(configuredDevice);

      const result = await printer.connect();

      expect(result).toBe(true);
      expect(configuredDevice.selectConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from printer', async () => {
      await printer.connect();
      await printer.disconnect();

      expect(mockUSBDevice.releaseInterface).toHaveBeenCalledWith(0);
      expect(mockUSBDevice.close).toHaveBeenCalled();
      expect(printer.isReady()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(printer.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect errors gracefully', async () => {
      await printer.connect();
      
      mockUSBDevice.releaseInterface.mockRejectedValueOnce(new Error('Release failed'));
      mockUSBDevice.close.mockRejectedValueOnce(new Error('Close failed'));

      await expect(printer.disconnect()).resolves.not.toThrow();
      expect(printer.isReady()).toBe(false);
    });
  });

  describe('print', () => {
    beforeEach(async () => {
      await printer.connect();
    });

    it('should print text successfully', async () => {
      const testText = 'Test receipt\nLine 2\nLine 3';
      
      const result = await printer.print(testText);

      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('thermal');
      expect(mockUSBDevice.transferOut).toHaveBeenCalled();
    });

    it('should add paper cut command by default', async () => {
      const testText = 'Test receipt';
      
      await printer.print(testText);

      // Should be called twice: once for text, once for cut command
      expect(mockUSBDevice.transferOut).toHaveBeenCalledTimes(2);
    });

    it('should skip paper cut when disabled', async () => {
      const testText = 'Test receipt';
      const config = { cutPaper: false, width: 32 };
      
      await printer.print(testText, config);

      // Should be called once for text only
      expect(mockUSBDevice.transferOut).toHaveBeenCalledTimes(1);
    });

    it('should open cash drawer when enabled', async () => {
      const testText = 'Test receipt';
      const config = { openDrawer: true, width: 32 };
      
      await printer.print(testText, config);

      // Should be called three times: text, cut command, drawer command
      expect(mockUSBDevice.transferOut).toHaveBeenCalledTimes(3);
    });

    it('should handle print failure', async () => {
      mockUSBDevice.transferOut.mockRejectedValueOnce(new Error('Transfer failed'));
      
      const result = await printer.print('Test text');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transfer failed');
      expect(result.printMethod).toBe('failed');
    });

    it('should fail when printer not connected', async () => {
      await printer.disconnect();
      
      const result = await printer.print('Test text');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Printer not connected');
      expect(result.printMethod).toBe('failed');
    });

    it('should handle large text by chunking', async () => {
      // Create text larger than typical packet size
      const largeText = 'A'.repeat(1000);
      
      const result = await printer.print(largeText);

      expect(result.success).toBe(true);
      // Should be called multiple times for chunking
      expect(mockUSBDevice.transferOut).toHaveBeenCalledTimes(2); // Text chunks + cut command
    });

    it('should handle missing OUT endpoint', async () => {
      const deviceWithoutEndpoint = {
        ...mockUSBDevice,
        configuration: {
          interfaces: [{
            alternates: [{
              endpoints: [] // No endpoints
            }]
          }]
        }
      };

      mockNavigatorUSB.requestDevice.mockResolvedValueOnce(deviceWithoutEndpoint);
      
      const newPrinter = new ThermalPrinter();
      await newPrinter.connect();
      
      const result = await newPrinter.print('Test text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No OUT endpoint found');
    });
  });

  describe('printTest', () => {
    beforeEach(async () => {
      await printer.connect();
    });

    it('should print test page successfully', async () => {
      const result = await printer.printTest();

      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('thermal');
      expect(mockUSBDevice.transferOut).toHaveBeenCalled();
    });

    it('should include test information in test print', async () => {
      await printer.printTest();

      // Verify that transferOut was called with test content
      const calls = mockUSBDevice.transferOut.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Convert the first call's data back to string to verify content
      const printedData = new TextDecoder().decode(calls[0][1]);
      expect(printedData).toContain('PRINTER TEST');
      expect(printedData).toContain('Status: Connected');
    });
  });

  describe('getConnectedPrinters', () => {
    it('should return list of connected printers', async () => {
      const printers = await ThermalPrinter.getConnectedPrinters();

      expect(printers).toHaveLength(1);
      expect(printers[0]).toBe(mockUSBDevice);
      expect(mockNavigatorUSB.getDevices).toHaveBeenCalled();
    });

    it('should filter devices by known printer vendor/product IDs', async () => {
      const unknownDevice = {
        vendorId: 0x9999,
        productId: 0x9999
      };

      mockNavigatorUSB.getDevices.mockResolvedValueOnce([mockUSBDevice, unknownDevice]);

      const printers = await ThermalPrinter.getConnectedPrinters();

      expect(printers).toHaveLength(1);
      expect(printers[0]).toBe(mockUSBDevice);
    });

    it('should return empty array when Web USB not supported', async () => {
      const originalNavigator = global.navigator;
      
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const printers = await ThermalPrinter.getConnectedPrinters();

      expect(printers).toHaveLength(0);

      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      });
    });

    it('should handle getDevices failure', async () => {
      mockNavigatorUSB.getDevices.mockRejectedValueOnce(new Error('Access denied'));

      const printers = await ThermalPrinter.getConnectedPrinters();

      expect(printers).toHaveLength(0);
    });
  });

  describe('isReady', () => {
    it('should return false when not connected', () => {
      expect(printer.isReady()).toBe(false);
    });

    it('should return true when connected', async () => {
      await printer.connect();
      expect(printer.isReady()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      await printer.connect();
      await printer.disconnect();
      expect(printer.isReady()).toBe(false);
    });
  });
});