'use client';

import { useEffect } from 'react';
import { settingsService } from '@/services/settings/settingsService';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Apply theme on initial load
    settingsService.applyTheme();

    // Subscribe to settings changes
    const unsubscribe = settingsService.subscribe((settings) => {
      settingsService.applyTheme();
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
}