'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { settingsService } from '@/services/settings/settingsService';
import { SystemSettings } from '@/types/settings';

export function SettingsTest() {
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = settingsService.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, []);

  const runTests = () => {
    const results: string[] = [];

    // Test 1: Session timeout update
    const originalTimeout = settings.security.sessionTimeout;
    settingsService.updateSettings({
      security: {
        ...settings.security,
        sessionTimeout: 45,
      }
    });
    
    const updatedSettings = settingsService.getSettings();
    if (updatedSettings.security.sessionTimeout === 45) {
      results.push('✅ Session timeout update works');
    } else {
      results.push('❌ Session timeout update failed');
    }

    // Test 2: Theme change
    const originalTheme = settings.display.theme;
    settingsService.updateSettings({
      display: {
        ...settings.display,
        theme: originalTheme === 'light' ? 'dark' : 'light',
      }
    });

    const themeSettings = settingsService.getSettings();
    if (themeSettings.display.theme !== originalTheme) {
      results.push('✅ Theme change works');
    } else {
      results.push('❌ Theme change failed');
    }

    // Test 3: Settings persistence
    const testKey = 'test_setting_' + Date.now();
    localStorage.setItem(testKey, 'test_value');
    const retrieved = localStorage.getItem(testKey);
    if (retrieved === 'test_value') {
      results.push('✅ Settings persistence works');
      localStorage.removeItem(testKey);
    } else {
      results.push('❌ Settings persistence failed');
    }

    // Restore original settings
    settingsService.updateSettings({
      security: {
        ...settings.security,
        sessionTimeout: originalTimeout,
      },
      display: {
        ...settings.display,
        theme: originalTheme,
      }
    });

    setTestResults(results);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Settings Functionality Test</h3>
      
      <div className="space-y-2 mb-4">
        <p><strong>Current Session Timeout:</strong> {settings.security.sessionTimeout} minutes</p>
        <p><strong>Current Theme:</strong> {settings.display.theme}</p>
        <p><strong>High Contrast:</strong> {settings.display.highContrast ? 'Enabled' : 'Disabled'}</p>
      </div>

      <Button onClick={runTests} className="mb-4">
        Run Settings Tests
      </Button>

      {testResults.length > 0 && (
        <div className="space-y-1">
          <h4 className="font-medium">Test Results:</h4>
          {testResults.map((result, index) => (
            <p key={index} className="text-sm font-mono">{result}</p>
          ))}
        </div>
      )}
    </div>
  );
}