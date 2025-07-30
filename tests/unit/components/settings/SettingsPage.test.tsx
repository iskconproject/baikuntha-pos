import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@/types/settings';

// Mock the settings service
vi.mock('@/services/settings/settingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => DEFAULT_SETTINGS),
    updateSettings: vi.fn(),
    subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
    validateSettings: vi.fn(() => []),
    resetToDefaults: vi.fn(),
  },
}));

// Mock all settings components
vi.mock('@/components/settings/SystemPreferences', () => ({
  SystemPreferences: ({ settings, onChange }: any) => (
    <div data-testid="system-preferences">
      <button onClick={() => onChange({ language: 'hi' })}>
        Change Language
      </button>
    </div>
  ),
}));

vi.mock('@/components/settings/PrinterConfiguration', () => ({
  PrinterConfiguration: ({ settings, onChange }: any) => (
    <div data-testid="printer-configuration">
      <button onClick={() => onChange({ printer: { enabled: false } })}>
        Disable Printer
      </button>
    </div>
  ),
}));

vi.mock('@/components/settings/ReceiptCustomization', () => ({
  ReceiptCustomization: ({ settings, onChange }: any) => (
    <div data-testid="receipt-customization">Receipt Settings</div>
  ),
}));

vi.mock('@/components/settings/SyncSettings', () => ({
  SyncSettings: ({ settings, onChange }: any) => (
    <div data-testid="sync-settings">Sync Settings</div>
  ),
}));

vi.mock('@/components/settings/SecuritySettings', () => ({
  SecuritySettings: ({ settings, onChange }: any) => (
    <div data-testid="security-settings">Security Settings</div>
  ),
}));

vi.mock('@/components/settings/BackupRestore', () => ({
  BackupRestore: ({ settings, onChange }: any) => (
    <div data-testid="backup-restore">Backup & Restore</div>
  ),
}));

vi.mock('@/components/settings/DisplaySettings', () => ({
  DisplaySettings: ({ settings, onChange }: any) => (
    <div data-testid="display-settings">Display Settings</div>
  ),
}));

vi.mock('@/components/settings/NotificationSettings', () => ({
  NotificationSettings: ({ settings, onChange }: any) => (
    <div data-testid="notification-settings">Notification Settings</div>
  ),
}));

vi.mock('@/components/settings/AuditLogSettings', () => ({
  AuditLogSettings: ({ settings, onChange }: any) => (
    <div data-testid="audit-log-settings">Audit Log Settings</div>
  ),
}));

// Import after mocks
import SettingsPage from '@/app/(dashboard)/settings/page';

describe('SettingsPage', () => {
  let mockSettingsService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { settingsService } = await import('@/services/settings/settingsService');
    mockSettingsService = settingsService;
  });

  it('should render settings page with categories sidebar', () => {
    render(<SettingsPage />);

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    
    // Check all category buttons (some appear twice - sidebar and header)
    expect(screen.getAllByText('System Preferences')).toHaveLength(2);
    expect(screen.getByText('Printer Configuration')).toBeInTheDocument();
    expect(screen.getByText('Receipt Customization')).toBeInTheDocument();
    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByText('Display Settings')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('should show system preferences by default', () => {
    render(<SettingsPage />);

    expect(screen.getByTestId('system-preferences')).toBeInTheDocument();
  });

  it('should switch categories when clicked', () => {
    render(<SettingsPage />);

    // Click on printer configuration
    const printerButton = screen.getByText('Printer Configuration');
    fireEvent.click(printerButton);

    expect(screen.getByTestId('printer-configuration')).toBeInTheDocument();
    expect(screen.queryByTestId('system-preferences')).not.toBeInTheDocument();
  });

  it('should show unsaved changes indicator when settings are modified', () => {
    render(<SettingsPage />);

    // Modify a setting
    const changeButton = screen.getByText('Change Language');
    fireEvent.click(changeButton);

    expect(screen.getByText('• Unsaved changes')).toBeInTheDocument();
  });

  it('should save changes when save button is clicked', async () => {
    render(<SettingsPage />);

    // Modify a setting
    const changeButton = screen.getByText('Change Language');
    fireEvent.click(changeButton);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSettingsService.updateSettings).toHaveBeenCalled();
    });
  });

  it('should validate settings before saving', async () => {
    mockSettingsService.validateSettings.mockReturnValue(['Test error']);
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SettingsPage />);

    // Modify a setting
    const changeButton = screen.getByText('Change Language');
    fireEvent.click(changeButton);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Validation errors:\nTest error');
    });

    alertSpy.mockRestore();
  });

  it('should reset to defaults when reset button is clicked', () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SettingsPage />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(mockSettingsService.resetToDefaults).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should not reset when user cancels confirmation', () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SettingsPage />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(mockSettingsService.resetToDefaults).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should disable save button when no changes are made', () => {
    render(<SettingsPage />);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when changes are made', () => {
    render(<SettingsPage />);

    // Modify a setting
    const changeButton = screen.getByText('Change Language');
    fireEvent.click(changeButton);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('should show category descriptions', () => {
    render(<SettingsPage />);

    expect(screen.getAllByText('Language, currency, timezone, and date format settings')).toHaveLength(2);
    expect(screen.getByText('Thermal printer setup and testing')).toBeInTheDocument();
    expect(screen.getByText('Header, footer, logo, and contact information')).toBeInTheDocument();
  });

  it('should display category icons', () => {
    render(<SettingsPage />);

    // Check for emoji icons in category buttons (appears twice - sidebar and header)
    expect(screen.getAllByText('⚙️')).toHaveLength(2);
    expect(screen.getByText('🖨️')).toBeInTheDocument();
    expect(screen.getByText('🧾')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });
});