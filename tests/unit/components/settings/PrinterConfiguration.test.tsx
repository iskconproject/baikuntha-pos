import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrinterConfiguration } from '@/components/settings/PrinterConfiguration';
import { DEFAULT_SETTINGS } from '@/types/settings';

// Mock the settings service
vi.mock('@/services/settings/settingsService', () => ({
  settingsService: {
    testPrinter: vi.fn(),
  },
}));

describe('PrinterConfiguration', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render printer configuration fields', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Printer Enabled')).toBeInTheDocument();
    expect(screen.getByText('Printer Type')).toBeInTheDocument();
    expect(screen.getByText('Paper Width')).toBeInTheDocument();
    expect(screen.getByText('Character Width')).toBeInTheDocument();
  });

  it('should enable/disable printer settings based on enabled checkbox', () => {
    const disabledSettings = {
      ...DEFAULT_SETTINGS,
      printer: {
        ...DEFAULT_SETTINGS.printer,
        enabled: false,
      },
    };

    render(
      <PrinterConfiguration
        settings={disabledSettings}
        onChange={mockOnChange}
      />
    );

    const printerTypeSelect = screen.getByRole('combobox', { name: /printer type/i });
    expect(printerTypeSelect).toBeDisabled();
  });

  it('should call onChange when printer enabled is toggled', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const enabledCheckbox = screen.getByRole('checkbox', { name: /enable receipt printing/i });
    fireEvent.click(enabledCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      printer: {
        ...DEFAULT_SETTINGS.printer,
        enabled: false,
      },
    });
  });

  it('should call onChange when printer type is changed', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const printerTypeSelect = screen.getByRole('combobox', { name: /printer type/i });
    fireEvent.change(printerTypeSelect, { target: { value: 'pdf' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      printer: {
        ...DEFAULT_SETTINGS.printer,
        type: 'pdf',
      },
    });
  });

  it('should call onChange when paper width is changed', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const paperWidthSelect = screen.getByRole('combobox', { name: /paper width/i });
    fireEvent.change(paperWidthSelect, { target: { value: '58' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      printer: {
        ...DEFAULT_SETTINGS.printer,
        paperWidth: 58,
      },
    });
  });

  it('should call onChange when character width is changed', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const characterWidthInput = screen.getByRole('spinbutton', { name: /character width/i });
    fireEvent.change(characterWidthInput, { target: { value: '40' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      printer: {
        ...DEFAULT_SETTINGS.printer,
        characterWidth: 40,
      },
    });
  });

  it('should show device connection section when thermal printer is enabled', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Device Connection')).toBeInTheDocument();
    expect(screen.getByText('Connected Device')).toBeInTheDocument();
    expect(screen.getByText('Available Devices')).toBeInTheDocument();
  });

  it('should show printer testing section when thermal printer is enabled', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Printer Testing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test print/i })).toBeInTheDocument();
  });

  it('should handle test print button click', async () => {
    const { settingsService } = await import('@/services/settings/settingsService');
    (settingsService.testPrinter as any).mockResolvedValue(true);

    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const testButton = screen.getByRole('button', { name: /test print/i });
    fireEvent.click(testButton);

    expect(testButton).toHaveTextContent('Testing...');
    
    await waitFor(() => {
      expect(screen.getByText(/Printer test successful/)).toBeInTheDocument();
    });
  });

  it('should display thermal printer setup instructions', () => {
    render(
      <PrinterConfiguration
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Thermal Printer Setup')).toBeInTheDocument();
    expect(screen.getByText(/Ensure your thermal printer is connected via USB/)).toBeInTheDocument();
  });
});