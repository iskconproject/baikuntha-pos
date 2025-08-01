import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  const mockOnLogin = vi.fn();
  const mockOnRememberDeviceChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onLogin: mockOnLogin,
    isLoading: false,
    onRememberDeviceChange: mockOnRememberDeviceChange,
  };

  it('renders login form with all required fields', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('BaikunthaPOS')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('PIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows remember device checkbox when callback is provided', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByLabelText('Remember this device')).toBeInTheDocument();
  });

  it('does not show remember device checkbox when callback is not provided', () => {
    render(<LoginForm {...defaultProps} onRememberDeviceChange={undefined} />);
    expect(screen.queryByLabelText('Remember this device')).not.toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);

    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('validates PIN length', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '123'); // Too short
    await user.click(submitButton);

    expect(screen.getByText('PIN must be at least 4 digits')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('only allows numeric input in PIN field', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const pinInput = screen.getByLabelText('PIN');
    
    await user.type(pinInput, 'abc123def');
    
    expect(pinInput).toHaveValue('123');
  });

  it('limits PIN to 8 characters', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const pinInput = screen.getByLabelText('PIN');
    
    await user.type(pinInput, '123456789');
    
    expect(pinInput).toHaveValue('12345678');
  });

  it('toggles PIN visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const pinInput = screen.getByLabelText('PIN');
    const toggleButton = screen.getByLabelText('Show PIN');

    expect(pinInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(pinInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide PIN')).toBeInTheDocument();

    await user.click(toggleButton);
    expect(pinInput).toHaveAttribute('type', 'password');
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockResolvedValue({ success: true });
    
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '1234');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('testuser', '1234');
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '1234');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('clears PIN on failed login', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '1234');
    await user.click(submitButton);

    await waitFor(() => {
      expect(pinInput).toHaveValue('');
    });
  });

  it('shows loading state during submission', async () => {
    render(<LoginForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: 'Signing in...' });
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByLabelText('PIN')).toBeDisabled();
  });

  it('displays external error prop', () => {
    render(<LoginForm {...defaultProps} error="Server error" />);
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('handles remember device checkbox', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} rememberDevice={false} />);

    const checkbox = screen.getByLabelText('Remember this device');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(mockOnRememberDeviceChange).toHaveBeenCalledWith(true);
  });

  it('disables submit button when fields are empty', () => {
    render(<LoginForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when both fields are filled', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '1234');

    expect(submitButton).not.toBeDisabled();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockRejectedValue(new Error('Network error'));
    
    render(<LoginForm {...defaultProps} />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(usernameInput, 'testuser');
    await user.type(pinInput, '1234');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('focuses username field on mount', () => {
    render(<LoginForm {...defaultProps} />);
    
    const usernameInput = screen.getByLabelText('Username');
    expect(usernameInput).toHaveFocus();
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm {...defaultProps} error="Test error" />);

    const usernameInput = screen.getByLabelText('Username');
    const pinInput = screen.getByLabelText('PIN');
    const errorMessage = screen.getByRole('alert');

    expect(usernameInput).toHaveAttribute('autoComplete', 'username');
    expect(pinInput).toHaveAttribute('autoComplete', 'current-password');
    expect(pinInput).toHaveAttribute('inputMode', 'numeric');
    expect(errorMessage).toHaveAttribute('aria-live', 'polite');
  });
});