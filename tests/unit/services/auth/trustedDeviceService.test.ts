import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trustedDeviceService } from '@/services/auth/trustedDeviceService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock canvas and navigator
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: class MockCanvas {
    getContext() {
      return {
        textBaseline: '',
        font: '',
        fillText: vi.fn(),
      };
    }
    toDataURL() {
      return 'mock-canvas-data';
    }
  },
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn().mockImplementation((tagName) => {
    if (tagName === 'canvas') {
      return new window.HTMLCanvasElement();
    }
    return {};
  }),
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true,
});

Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  writable: true,
});

Object.defineProperty(screen, 'width', {
  value: 1920,
  writable: true,
});

Object.defineProperty(screen, 'height', {
  value: 1080,
  writable: true,
});

describe('TrustedDeviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Device Trust Management', () => {
    it('should not trust device initially', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const isTrusted = trustedDeviceService.isDeviceTrusted('testuser');
      expect(isTrusted).toBe(false);
    });

    it('should trust device after calling trustDevice', () => {
      const mockDevices = JSON.stringify([]);
      mockLocalStorage.getItem.mockReturnValue(mockDevices);
      
      trustedDeviceService.trustDevice('testuser');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Mock the stored data for the next call
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const storedDevices = JSON.parse(setItemCall[1]);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedDevices));
      
      const isTrusted = trustedDeviceService.isDeviceTrusted('testuser');
      expect(isTrusted).toBe(true);
    });

    it('should untrust device', () => {
      // First trust the device
      const mockDevices = JSON.stringify([{
        deviceId: 'test-device-id',
        username: 'testuser',
        trustedAt: Date.now(),
        userAgent: 'Mozilla/5.0 (Test Browser)',
        lastUsed: Date.now(),
      }]);
      mockLocalStorage.getItem.mockReturnValue(mockDevices);
      
      trustedDeviceService.untrustDevice('testuser');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should filter out expired devices', () => {
      const expiredTime = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      const mockDevices = JSON.stringify([{
        deviceId: 'expired-device',
        username: 'testuser',
        trustedAt: expiredTime,
        userAgent: 'Mozilla/5.0 (Test Browser)',
        lastUsed: expiredTime,
      }]);
      mockLocalStorage.getItem.mockReturnValue(mockDevices);
      
      const isTrusted = trustedDeviceService.isDeviceTrusted('testuser');
      expect(isTrusted).toBe(false);
    });
  });

  describe('Username Management', () => {
    it('should store and retrieve last remembered username', () => {
      mockLocalStorage.getItem.mockReturnValue('testuser');
      
      const lastUsername = trustedDeviceService.getLastRememberedUsername();
      expect(lastUsername).toBe('testuser');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('vaikuntha-last-username');
    });

    it('should set last remembered username', () => {
      trustedDeviceService.setLastRememberedUsername('newuser');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vaikuntha-last-username', 'newuser');
    });

    it('should clear last remembered username', () => {
      trustedDeviceService.clearLastRememberedUsername();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vaikuntha-last-username');
    });

    it('should return null when no username is remembered', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const lastUsername = trustedDeviceService.getLastRememberedUsername();
      expect(lastUsername).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const isTrusted = trustedDeviceService.isDeviceTrusted('testuser');
      expect(isTrusted).toBe(false);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const isTrusted = trustedDeviceService.isDeviceTrusted('testuser');
      expect(isTrusted).toBe(false);
    });
  });

  describe('Device Cleanup', () => {
    it('should clean up expired devices', () => {
      const now = Date.now();
      const validDevice = {
        deviceId: 'valid-device',
        username: 'testuser',
        trustedAt: now - (10 * 24 * 60 * 60 * 1000), // 10 days ago
        userAgent: 'Mozilla/5.0 (Test Browser)',
        lastUsed: now,
      };
      const expiredDevice = {
        deviceId: 'expired-device',
        username: 'testuser',
        trustedAt: now - (31 * 24 * 60 * 60 * 1000), // 31 days ago
        userAgent: 'Mozilla/5.0 (Test Browser)',
        lastUsed: now - (31 * 24 * 60 * 60 * 1000),
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([validDevice, expiredDevice]));
      
      trustedDeviceService.cleanupExpiredDevices();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const cleanedDevices = JSON.parse(setItemCall[1]);
      expect(cleanedDevices).toHaveLength(1);
      expect(cleanedDevices[0].deviceId).toBe('valid-device');
    });
  });
});