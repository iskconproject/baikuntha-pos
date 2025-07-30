import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

// Mock Next.js router
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects admin users to admin dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        username: 'admin',
        role: 'admin',
        isActive: true
      },
      isLoading: false
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  it('redirects manager users to manager dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'manager-1',
        username: 'manager',
        role: 'manager',
        isActive: true
      },
      isLoading: false
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/manager');
    });
  });

  it('redirects cashier users to cashier dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'cashier-1',
        username: 'cashier',
        role: 'cashier',
        isActive: true
      },
      isLoading: false
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/cashier');
    });
  });

  it('redirects unknown roles to cashier dashboard as default', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'unknown-1',
        username: 'unknown',
        role: 'unknown',
        isActive: true
      },
      isLoading: false
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/cashier');
    });
  });

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true
    });

    render(<DashboardPage />);

    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false
    });

    render(<DashboardPage />);

    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when user is null but still loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true
    });

    render(<DashboardPage />);

    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('displays loading spinner with correct styling', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true
    });

    render(<DashboardPage />);

    const spinner = screen.getByText('Redirecting to dashboard...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-saffron-600');
  });

  it('handles role changes correctly', async () => {
    // Start with admin user
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        username: 'admin',
        role: 'admin',
        isActive: true
      },
      isLoading: false
    });

    const { rerender } = render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin');
    });

    // Change to manager user
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'manager-1',
        username: 'manager',
        role: 'manager',
        isActive: true
      },
      isLoading: false
    });

    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/manager');
    });
  });

  it('handles transition from loading to loaded state', async () => {
    // Start with loading state
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true
    });

    const { rerender } = render(<DashboardPage />);

    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    // Transition to loaded state with user
    mockUseAuth.mockReturnValue({
      user: {
        id: 'cashier-1',
        username: 'cashier',
        role: 'cashier',
        isActive: true
      },
      isLoading: false
    });

    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/cashier');
    });
  });

  it('does not redirect multiple times for same user', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        username: 'admin',
        role: 'admin',
        isActive: true
      },
      isLoading: false
    });

    const { rerender } = render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin');
    });

    // Clear mocks and re-render with same user
    vi.clearAllMocks();
    rerender(<DashboardPage />);

    // Should not redirect again
    expect(mockReplace).not.toHaveBeenCalled();
  });
});