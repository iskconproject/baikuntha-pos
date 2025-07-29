import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '@/components/auth/UserProfile';
import type { AuthUser } from '@/types/auth';

describe('UserProfile', () => {
  const mockOnLogout = vi.fn();

  const mockUser: AuthUser = {
    id: '1',
    username: 'testuser',
    role: 'manager',
    isActive: true,
    lastLoginAt: new Date('2024-01-15T10:30:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    user: mockUser,
    onLogout: mockOnLogout,
  };

  it('renders user profile button with user info', () => {
    render(<UserProfile {...defaultProps} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // Avatar initial
  });

  it('displays session timer when provided', () => {
    render(<UserProfile {...defaultProps} timeUntilLogout={300} />);

    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('opens profile modal when clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile {...defaultProps} />);

    const profileButton = screen.getByLabelText('Open user profile');
    await user.click(profileButton);

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onLogout when Sign Out is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile {...defaultProps} />);

    const profileButton = screen.getByLabelText('Open user profile');
    await user.click(profileButton);

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });
});