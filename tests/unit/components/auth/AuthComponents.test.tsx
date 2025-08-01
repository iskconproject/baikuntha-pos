import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';
import { UserProfile } from '@/components/auth/UserProfile';
import type { AuthUser } from '@/types/auth';

describe('Authentication Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginForm', () => {
    const mockOnLogin = vi.fn();
    const defaultProps = {
      onLogin: mockOnLogin,
      isLoading: false,
    };

    it('renders login form correctly', () => {
      render(<LoginForm {...defaultProps} />);
      
      expect(screen.getByText('BaikunthaPOS')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('PIN')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('validates PIN input to only allow numbers', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const pinInput = screen.getByLabelText('PIN');
      await user.type(pinInput, 'abc123def');
      
      expect(pinInput).toHaveValue('123');
    });

    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      mockOnLogin.mockResolvedValue({ success: true });
      
      render(<LoginForm {...defaultProps} />);

      await user.type(screen.getByLabelText('Username'), 'testuser');
      await user.type(screen.getByLabelText('PIN'), '1234');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      expect(mockOnLogin).toHaveBeenCalledWith('testuser', '1234');
    });

    it('displays error messages', () => {
      render(<LoginForm {...defaultProps} error="Invalid credentials" />);
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  describe('SessionTimeoutWarning', () => {
    const mockOnExtendSession = vi.fn();
    const mockOnLogout = vi.fn();
    const defaultProps = {
      onExtendSession: mockOnExtendSession,
      onLogout: mockOnLogout,
      warningThreshold: 300,
    };

    it('shows warning when time is below threshold', () => {
      render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
      expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    });

    it('does not show warning when time is above threshold', () => {
      render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={400} />);
      expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
    });

    it('calls extend session when button clicked', async () => {
      const user = userEvent.setup();
      render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
      
      await user.click(screen.getByRole('button', { name: 'Stay Signed In' }));
      expect(mockOnExtendSession).toHaveBeenCalled();
    });
  });

  describe('UserProfile', () => {
    const mockUser: AuthUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    const mockOnLogout = vi.fn();
    const defaultProps = {
      user: mockUser,
      onLogout: mockOnLogout,
    };

    it('renders user profile button', () => {
      render(<UserProfile {...defaultProps} />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('opens profile modal when clicked', async () => {
      const user = userEvent.setup();
      render(<UserProfile {...defaultProps} />);

      await user.click(screen.getByLabelText('Open user profile'));
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    it('displays session timer when provided', () => {
      render(<UserProfile {...defaultProps} timeUntilLogout={300} />);
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });
  });
});