import type { PrinterConfig, PrintResult } from "@/types/receipt";

// Web USB types (since they might not be available in all environments)
declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: {
        filters: Array<{ vendorId: number; productId: number }>;
      }): Promise<USBDevice | null>;
      getDevices(): Promise<USBDevice[]>;
    };
  }
}

interface USBDevice {
  vendorId: number;
  productId: number;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: Uint8Array
  ): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBInterface {
  alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  direction: "in" | "out";
  endpointNumber: number;
  packetSize: number;
}

interface USBOutTransferResult {
  status: "ok" | "stall" | "babble";
}

export class ThermalPrinter {
  private device: USBDevice | null = null;
  private isConnected: boolean = false;

  // ESC/POS commands
  private static readonly ESC = "\x1B";
  private static readonly GS = "\x1D";

  // Common thermal printer vendor/product IDs
  private static readonly COMMON_PRINTERS = [
    { vendorId: 0x04b8, productId: 0x0202 }, // Epson
    { vendorId: 0x04b8, productId: 0x0005 }, // Epson TM-T20
    { vendorId: 0x0519, productId: 0x0003 }, // Star Micronics
    { vendorId: 0x0fe6, productId: 0x811e }, // ICS Advent
    { vendorId: 0x28e9, productId: 0x0289 }, // Generic thermal printer
  ];

  /**
   * Check if Web USB is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "usb" in navigator &&
      !!navigator.usb &&
      "requestDevice" in navigator.usb
    );
  }

  /**
   * Request permission and connect to thermal printer
   */
  async connect(config?: PrinterConfig["thermalConfig"]): Promise<boolean> {
    if (!ThermalPrinter.isSupported()) {
      throw new Error("Web USB is not supported in this browser");
    }

    try {
      // Request device with filters for common thermal printers
      const filters =
        config?.vendorId && config?.productId
          ? [{ vendorId: config.vendorId, productId: config.productId }]
          : ThermalPrinter.COMMON_PRINTERS;

      this.device = await navigator.usb!.requestDevice({ filters });

      if (!this.device) {
        throw new Error("No printer device selected");
      }

      // Open the device
      await this.device.open();

      // Select configuration (usually the first one)
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim the interface (usually interface 0)
      await this.device.claimInterface(0);

      this.isConnected = true;

      // Initialize printer
      await this.initialize();

      return true;
    } catch (error) {
      console.error("Failed to connect to thermal printer:", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    if (this.device && this.isConnected) {
      try {
        await this.device.releaseInterface(0);
        await this.device.close();
      } catch (error) {
        console.error("Error disconnecting from printer:", error);
      }
    }

    this.device = null;
    this.isConnected = false;
  }

  /**
   * Check if printer is connected
   */
  isReady(): boolean {
    return this.isConnected && this.device !== null;
  }

  /**
   * Print text to thermal printer
   */
  async print(
    text: string,
    config?: PrinterConfig["thermalConfig"]
  ): Promise<PrintResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: "Printer not connected",
        printMethod: "failed",
      };
    }

    try {
      // Convert text to bytes
      const encoder = new TextEncoder();
      let data = encoder.encode(text);

      // Add paper cut command if enabled
      if (config?.cutPaper !== false) {
        const cutCommand = encoder.encode(ThermalPrinter.ESC + "m");
        const combinedData = new Uint8Array(data.length + cutCommand.length);
        combinedData.set(data);
        combinedData.set(cutCommand, data.length);
        data = combinedData;
      }

      // Send data to printer
      await this.sendData(data);

      // Open cash drawer if enabled
      if (config?.openDrawer) {
        await this.openCashDrawer();
      }

      return {
        success: true,
        printMethod: "thermal",
      };
    } catch (error) {
      console.error("Failed to print:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Print failed",
        printMethod: "failed",
      };
    }
  }

  /**
   * Initialize printer with default settings
   */
  private async initialize(): Promise<void> {
    if (!this.device) return;

    const commands = [
      ThermalPrinter.ESC + "@", // Initialize printer
      ThermalPrinter.ESC + "a" + "\x01", // Center alignment
      ThermalPrinter.ESC + "!" + "\x00", // Normal text size
    ];

    for (const command of commands) {
      const encoder = new TextEncoder();
      await this.sendData(encoder.encode(command));
    }
  }

  /**
   * Send raw data to printer
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.device) {
      throw new Error("Printer device not available");
    }

    // Find the OUT endpoint
    const interface0 = this.device.configuration?.interfaces[0];
    const alternate = interface0?.alternates[0];
    const outEndpoint = alternate?.endpoints.find(
      (ep) => ep.direction === "out"
    );

    if (!outEndpoint) {
      throw new Error("No OUT endpoint found on printer");
    }

    // Transfer data in chunks if necessary
    const maxPacketSize = outEndpoint.packetSize;
    let offset = 0;

    while (offset < data.length) {
      const chunkSize = Math.min(maxPacketSize, data.length - offset);
      const chunk = data.slice(offset, offset + chunkSize);

      await this.device.transferOut(outEndpoint.endpointNumber, chunk);
      offset += chunkSize;
    }
  }

  /**
   * Open cash drawer (if connected)
   */
  private async openCashDrawer(): Promise<void> {
    // Standard cash drawer open command
    const drawerCommand = ThermalPrinter.ESC + "p" + "\x00" + "\x19" + "\xfa";
    const encoder = new TextEncoder();
    await this.sendData(encoder.encode(drawerCommand));
  }

  /**
   * Get list of connected USB devices that might be printers
   */
  static async getConnectedPrinters(): Promise<USBDevice[]> {
    if (!ThermalPrinter.isSupported()) {
      return [];
    }

    try {
      const devices = await navigator.usb!.getDevices();
      return devices.filter((device) =>
        ThermalPrinter.COMMON_PRINTERS.some(
          (printer) =>
            device.vendorId === printer.vendorId &&
            device.productId === printer.productId
        )
      );
    } catch (error) {
      console.error("Failed to get connected printers:", error);
      return [];
    }
  }

  /**
   * Test printer connection by printing a test page
   */
  async printTest(): Promise<PrintResult> {
    const testText = `
PRINTER TEST
${"-".repeat(32)}
Date: ${new Date().toLocaleString()}
Status: Connected
${"-".repeat(32)}
Test completed successfully!


`;

    return await this.print(testText, { width: 32, cutPaper: true });
  }
}
