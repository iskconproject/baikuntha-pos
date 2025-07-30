import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserActivityModal } from '@/components/users/UserActivityModal';
import type { UserRole } from '@/types/auth';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock components
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const mockUser = {
  id: '1',
  username: 'testuser',
  role: 'manager' as UserRole,
};

const mockActivities = [
  {
    id: '1',
    userId: '1',
    username: 'testuser',
    action: 'login',
    details: { username: 'testuser' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    userId: '1',
    username: 'testuser',
    action: 'create_user',
    targetUserId: '2',
    targetUsername: 'newuser',
    details: { username: 'newuser', role: 'cashier' },
    ipAddress: '192.168.1.1',
    timestamp: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: '3',
    userId: '1',
    username: 'testuser',
    action: 'update_user',
    targetUserId: '2',
    targetUsername: 'newuser',
    details: { username: 'newuser', changes: { role: 'manager' } },
    timestamp: new Date('2024-01-01T12:00:00Z'),
  },
];

describe('UserActivityModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: mockActivities,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders activity modal with user information', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    expect(screen.getByLabelText('Activity Log - testuser')).toBeInTheDocument();
  });

  it('fetches and displays user activities', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1/activity?limit=50');
    });

    await waitFor(() => {
      // Look for action badges specifically in the activity list
      const actionBadges = document.querySelectorAll('.space-y-3 .rounded-full');
      const badgeTexts = Array.from(actionBadges).map(badge => badge.textContent);
      
      expect(badgeTexts).toContain('Login');
      expect(badgeTexts).toContain('Created User');
      expect(badgeTexts).toContain('Updated User');
    });
  });

  it('displays activity details correctly', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      // Check for target user information (there are multiple "Target:" labels)
      const targetLabels = screen.getAllByText('Target:');
      expect(targetLabels.length).toBeGreaterThan(0);
      
      // Check for target username (there are multiple instances)
      const newuserElements = screen.getAllByText('newuser');
      expect(newuserElements.length).toBeGreaterThan(0);
      
      // Check for IP address (there are multiple instances)
      const ipElements = screen.getAllByText('IP: 192.168.1.1');
      expect(ipElements.length).toBeGreaterThan(0);
    });
  });

  it('filters activities by action type', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      const actionSelect = screen.getByDisplayValue('All Actions');
      fireEvent.change(actionSelect, { target: { value: 'login' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1/activity?limit=50&action=login');
    });
  });

  it('refreshes activity data when refresh button is clicked', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Wait for refresh call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('displays activity details in JSON format', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      const detailsLabels = screen.getAllByText('Details:');
      expect(detailsLabels.length).toBeGreaterThan(0);
      
      // Check for JSON formatted details in pre elements
      const preElements = document.querySelectorAll('pre');
      expect(preElements.length).toBeGreaterThan(0);
      
      // Check that at least one pre element contains JSON
      const hasJsonContent = Array.from(preElements).some(pre => 
        pre.textContent?.includes('"username"')
      );
      expect(hasJsonContent).toBe(true);
    });
  });

  it('shows loading spinner while fetching data', () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays no activity message when list is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: [],
      }),
    });

    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No activity found')).toBeInTheDocument();
    });
  });

  it('displays error message when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch user activity'));

    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch user activity')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays correct action labels and colors', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      // Look for action badges specifically in the activity list
      const actionBadges = document.querySelectorAll('.space-y-3 .rounded-full');
      expect(actionBadges).toHaveLength(3);
      
      const badgeTexts = Array.from(actionBadges).map(badge => badge.textContent);
      expect(badgeTexts).toContain('Login');
      expect(badgeTexts).toContain('Created User');
      expect(badgeTexts).toContain('Updated User');
    });
  });

  it('formats timestamps correctly', async () => {
    render(<UserActivityModal user={mockUser} onClose={mockOnClose} />);

    await waitFor(() => {
      // Check that timestamps are displayed (the format is "1 Jan 2024, 03:30 pm")
      expect(screen.getByText('1 Jan 2024, 03:30 pm')).toBeInTheDocument();
    });
  });
});