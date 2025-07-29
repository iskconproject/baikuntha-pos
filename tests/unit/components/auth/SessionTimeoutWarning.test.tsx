import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';

describe('SessionTimeoutWarning', () => {
  const mockOnExtendSession = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onExtendSession: mockOnExtendSession,
    onLogout: mockOnLogout,
    warningThreshold: 300, // 5 minutes
  };

  it('does not show warning when timeUntilLogout is null', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={null} />);
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('does not show warning when time is above threshold', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={400} />);
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('shows warning when time is below threshold', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('Your session will expire soon')).toBeInTheDocument();
  });

  it('displays countdown in minutes and seconds format', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={125} />);
    
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('displays countdown in seconds only when less than a minute', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={45} />);
    
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('calls onExtendSession when Stay Signed In is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    const staySignedInButton = screen.getByRole('button', { name: 'Stay Signed In' });
    await user.click(staySignedInButton);
    
    expect(mockOnExtendSession).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when Sign Out Now is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out Now' });
    await user.click(signOutButton);
    
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout automatically when time reaches 0', () => {
    const { rerender } = render(
      <SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />
    );
    
    // Simulate time reaching 0
    rerender(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={0} />);
    
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it('hides warning after extending session', async () => {
    const user = userEvent.setup();
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    
    const staySignedInButton = screen.getByRole('button', { name: 'Stay Signed In' });
    await user.click(staySignedInButton);
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('hides warning after manual logout', async () => {
    const user = userEvent.setup();
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out Now' });
    await user.click(signOutButton);
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('cannot be closed by clicking backdrop', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    
    // Try to click outside the modal content
    fireEvent.click(modal);
    
    // Modal should still be visible
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
  });

  it('cannot be closed by pressing Escape', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Modal should still be visible
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
  });

  it('uses custom warning threshold', () => {
    render(
      <SessionTimeoutWarning 
        {...defaultProps} 
        timeUntilLogout={100} 
        warningThreshold={120}
      />
    );
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
  });

  it('does not show warning when time equals threshold', () => {
    render(
      <SessionTimeoutWarning 
        {...defaultProps} 
        timeUntilLogout={300} 
        warningThreshold={300}
      />
    );
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
    
    const title = screen.getByText('Session Expiring Soon');
    expect(title).toHaveAttribute('id');
  });

  it('displays helpful information text', () => {
    render(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={250} />);
    
    expect(screen.getByText(/Click "Stay Signed In" to extend your session/)).toBeInTheDocument();
    expect(screen.getByText(/For security, you are automatically signed out after 30 minutes/)).toBeInTheDocument();
  });

  it('formats time correctly for edge cases', () => {
    const { rerender } = render(
      <SessionTimeoutWarning {...defaultProps} timeUntilLogout={60} />
    );
    
    expect(screen.getByText('1:00')).toBeInTheDocument();
    
    rerender(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={1} />);
    expect(screen.getByText('1s')).toBeInTheDocument();
    
    rerender(<SessionTimeoutWarning {...defaultProps} timeUntilLogout={0} />);
    // Should trigger logout and hide modal
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });
});