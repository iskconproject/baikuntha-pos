/**
 * Trusted Device Service
 * Manages device trust for "remember device" functionality
 */

interface TrustedDevice {
  deviceId: string;
  username: string;
  trustedAt: number;
  userAgent: string;
  lastUsed: number;
}

const TRUSTED_DEVICES_KEY = 'baikuntha-trusted-devices';
const DEVICE_TRUST_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export class TrustedDeviceService {
  private static instance: TrustedDeviceService;

  private constructor() {}

  static getInstance(): TrustedDeviceService {
    if (!TrustedDeviceService.instance) {
      TrustedDeviceService.instance = new TrustedDeviceService();
    }
    return TrustedDeviceService.instance;
  }

  /**
   * Generate a unique device ID based on browser characteristics
   */
  private generateDeviceId(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get all trusted devices from localStorage
   */
  private getTrustedDevices(): TrustedDevice[] {
    try {
      const stored = localStorage.getItem(TRUSTED_DEVICES_KEY);
      if (!stored) return [];
      
      const devices: TrustedDevice[] = JSON.parse(stored);
      const now = Date.now();
      
      // Filter out expired devices
      return devices.filter(device => 
        (now - device.trustedAt) < DEVICE_TRUST_DURATION
      );
    } catch (error) {
      console.error('Error reading trusted devices:', error);
      return [];
    }
  }

  /**
   * Save trusted devices to localStorage
   */
  private saveTrustedDevices(devices: TrustedDevice[]): void {
    try {
      localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
    } catch (error) {
      console.error('Error saving trusted devices:', error);
    }
  }

  /**
   * Check if current device is trusted for the given username
   */
  isDeviceTrusted(username: string): boolean {
    const deviceId = this.generateDeviceId();
    const trustedDevices = this.getTrustedDevices();
    
    const device = trustedDevices.find(d => 
      d.deviceId === deviceId && d.username === username
    );
    
    if (device) {
      // Update last used timestamp
      device.lastUsed = Date.now();
      this.saveTrustedDevices(trustedDevices);
      return true;
    }
    
    return false;
  }

  /**
   * Trust the current device for the given username
   */
  trustDevice(username: string): void {
    const deviceId = this.generateDeviceId();
    const trustedDevices = this.getTrustedDevices();
    const now = Date.now();
    
    // Remove existing trust for this device/username combination
    const filteredDevices = trustedDevices.filter(d => 
      !(d.deviceId === deviceId && d.username === username)
    );
    
    // Add new trust entry
    const newDevice: TrustedDevice = {
      deviceId,
      username,
      trustedAt: now,
      userAgent: navigator.userAgent,
      lastUsed: now,
    };
    
    filteredDevices.push(newDevice);
    
    // Keep only the most recent 10 trusted devices per user
    const userDevices = filteredDevices.filter(d => d.username === username);
    if (userDevices.length > 10) {
      userDevices.sort((a, b) => b.lastUsed - a.lastUsed);
      const devicesToKeep = userDevices.slice(0, 10);
      const otherDevices = filteredDevices.filter(d => d.username !== username);
      this.saveTrustedDevices([...otherDevices, ...devicesToKeep]);
    } else {
      this.saveTrustedDevices(filteredDevices);
    }
  }

  /**
   * Remove trust for current device and username
   */
  untrustDevice(username: string): void {
    const deviceId = this.generateDeviceId();
    const trustedDevices = this.getTrustedDevices();
    
    const filteredDevices = trustedDevices.filter(d => 
      !(d.deviceId === deviceId && d.username === username)
    );
    
    this.saveTrustedDevices(filteredDevices);
  }

  /**
   * Remove all trusted devices for a username
   */
  untrustAllDevices(username: string): void {
    const trustedDevices = this.getTrustedDevices();
    const filteredDevices = trustedDevices.filter(d => d.username !== username);
    this.saveTrustedDevices(filteredDevices);
  }

  /**
   * Get trusted devices for a username (for admin purposes)
   */
  getTrustedDevicesForUser(username: string): Omit<TrustedDevice, 'deviceId'>[] {
    const trustedDevices = this.getTrustedDevices();
    return trustedDevices
      .filter(d => d.username === username)
      .map(({ deviceId, ...device }) => device)
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }

  /**
   * Clean up expired trusted devices
   */
  cleanupExpiredDevices(): void {
    const validDevices = this.getTrustedDevices();
    this.saveTrustedDevices(validDevices);
  }

  /**
   * Get the last remembered username for this device
   */
  getLastRememberedUsername(): string | null {
    try {
      return localStorage.getItem('baikuntha-last-username');
    } catch (error) {
      console.error('Error reading last username:', error);
      return null;
    }
  }

  /**
   * Set the last remembered username for this device
   */
  setLastRememberedUsername(username: string): void {
    try {
      localStorage.setItem('baikuntha-last-username', username);
    } catch (error) {
      console.error('Error saving last username:', error);
    }
  }

  /**
   * Clear the last remembered username
   */
  clearLastRememberedUsername(): void {
    try {
      localStorage.removeItem('baikuntha-last-username');
    } catch (error) {
      console.error('Error clearing last username:', error);
    }
  }
}

export const trustedDeviceService = TrustedDeviceService.getInstance();