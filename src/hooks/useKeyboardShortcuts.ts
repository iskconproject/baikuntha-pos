'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// Common keyboard shortcuts
export const commonShortcuts = {
  // Navigation
  goToSales: { key: 's', ctrlKey: true, description: 'Go to Sales (Ctrl+S)' },
  goToInventory: { key: 'i', ctrlKey: true, description: 'Go to Inventory (Ctrl+I)' },
  goToReports: { key: 'r', ctrlKey: true, description: 'Go to Reports (Ctrl+R)' },
  goToUsers: { key: 'u', ctrlKey: true, description: 'Go to Users (Ctrl+U)' },
  
  // Actions
  newTransaction: { key: 'n', ctrlKey: true, description: 'New Transaction (Ctrl+N)' },
  addProduct: { key: 'p', ctrlKey: true, description: 'Add Product (Ctrl+P)' },
  search: { key: 'f', ctrlKey: true, description: 'Search (Ctrl+F)' },
  save: { key: 's', ctrlKey: true, description: 'Save (Ctrl+S)' },
  
  // Cart actions
  clearCart: { key: 'Delete', shiftKey: true, description: 'Clear Cart (Shift+Delete)' },
  checkout: { key: 'Enter', ctrlKey: true, description: 'Checkout (Ctrl+Enter)' },
  
  // General
  escape: { key: 'Escape', description: 'Cancel/Close (Escape)' },
  help: { key: '?', shiftKey: true, description: 'Show Help (Shift+?)' },
};