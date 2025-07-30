import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemPreferences } from '@/components/settings/SystemPreferences';
import { DEFAULT_SETTINGS } from '@/types/settings';

describe('SystemPreferences', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all preference fields', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('Date Format')).toBeInTheDocument();
    expect(screen.getByText('Time Format')).toBeInTheDocument();
  });

  it('should display current settings values', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      language: 'hi' as const,
      currency: 'USD' as const,
    };

    render(
      <SystemPreferences
        settings={customSettings}
        onChange={mockOnChange}
      />
    );

    // Check if the select elements have the correct values
    const languageSelect = screen.getByDisplayValue('हिन्दी (Hindi)');
    const currencySelect = screen.getByDisplayValue('US Dollar ($)');
    
    expect(languageSelect).toBeInTheDocument();
    expect(currencySelect).toBeInTheDocument();
  });

  it('should call onChange when language is changed', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const languageSelect = screen.getByRole('combobox', { name: /language/i });
    fireEvent.change(languageSelect, { target: { value: 'hi' } });

    expect(mockOnChange).toHaveBeenCalledWith({ language: 'hi' });
  });

  it('should call onChange when currency is changed', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const currencySelect = screen.getByRole('combobox', { name: /currency/i });
    fireEvent.change(currencySelect, { target: { value: 'USD' } });

    expect(mockOnChange).toHaveBeenCalledWith({ currency: 'USD' });
  });

  it('should call onChange when timezone is changed', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const timezoneSelect = screen.getByRole('combobox', { name: /timezone/i });
    fireEvent.change(timezoneSelect, { target: { value: 'UTC' } });

    expect(mockOnChange).toHaveBeenCalledWith({ timezone: 'UTC' });
  });

  it('should call onChange when date format is changed', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const dateFormatSelect = screen.getByRole('combobox', { name: /date format/i });
    fireEvent.change(dateFormatSelect, { target: { value: 'MM/DD/YYYY' } });

    expect(mockOnChange).toHaveBeenCalledWith({ dateFormat: 'MM/DD/YYYY' });
  });

  it('should call onChange when time format is changed', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    const timeFormatSelect = screen.getByRole('combobox', { name: /time format/i });
    fireEvent.change(timeFormatSelect, { target: { value: '24h' } });

    expect(mockOnChange).toHaveBeenCalledWith({ timeFormat: '24h' });
  });

  it('should display regional settings information', () => {
    render(
      <SystemPreferences
        settings={DEFAULT_SETTINGS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Regional Settings')).toBeInTheDocument();
    expect(screen.getByText(/These settings affect how dates, times, numbers/)).toBeInTheDocument();
  });
});