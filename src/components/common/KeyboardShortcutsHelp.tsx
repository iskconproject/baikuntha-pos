'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardKey: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
}> = ({ children, className }) => (
  <kbd className={cn(
    'inline-flex items-center justify-center',
    'px-2 py-1 text-xs font-mono font-semibold',
    'bg-gray-100 text-gray-800 border border-gray-300 rounded',
    'shadow-sm',
    className
  )}>
    {children}
  </kbd>
);

const ShortcutDisplay: React.FC<{ shortcut: KeyboardShortcut }> = ({ shortcut }) => {
  const keys = [];
  
  if (shortcut.ctrlKey) keys.push('Ctrl');
  if (shortcut.metaKey) keys.push('Cmd');
  if (shortcut.altKey) keys.push('Alt');
  if (shortcut.shiftKey) keys.push('Shift');
  keys.push(shortcut.key);

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400 text-xs mx-1">+</span>}
            <KeyboardKey>{key}</KeyboardKey>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  isOpen,
  onClose,
}) => {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.description.includes('Go to') ? 'Navigation' :
                    shortcut.description.includes('Cart') ? 'Cart Actions' :
                    shortcut.description.includes('Transaction') || 
                    shortcut.description.includes('Product') ||
                    shortcut.description.includes('Search') ||
                    shortcut.description.includes('Save') ? 'Actions' : 'General';
    
    if (!groups[category]) groups[category] = [];
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Use these keyboard shortcuts to navigate and perform actions quickly.
        </p>

        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {category}
            </h3>
            <div className="space-y-1 border border-gray-200 rounded-lg p-4">
              {categoryShortcuts.map((shortcut, index) => (
                <ShortcutDisplay key={index} shortcut={shortcut} />
              ))}
            </div>
          </div>
        ))}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Note
              </h4>
              <p className="text-sm text-blue-800">
                Keyboard shortcuts are disabled when typing in input fields. 
                Press <KeyboardKey className="mx-1">Escape</KeyboardKey> to close dialogs and return focus to the main interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Hook to show keyboard shortcuts help
export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const showHelp = () => setIsOpen(true);
  const hideHelp = () => setIsOpen(false);

  return {
    isOpen,
    showHelp,
    hideHelp,
    KeyboardShortcutsHelpModal: ({ shortcuts }: { shortcuts: KeyboardShortcut[] }) => (
      <KeyboardShortcutsHelp
        shortcuts={shortcuts}
        isOpen={isOpen}
        onClose={hideHelp}
      />
    ),
  };
};