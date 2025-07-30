import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserList } from '@/components/users/UserList';
import type { UserRole } from '@/types/auth';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock components
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

vi.mock('@/components/forms/CreateUserForm', () => ({
  CreateUserForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="create-user-form">
      <button onClick={() => onSubmit({ username: 'test', pin: '1234', confirmPin: '1234', role: 'cashier' })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/forms/EditUserForm', () => ({
  EditUserForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="edit-user-form">
      <button onClick={() => onSubmit({ username: 'updated' })}>Update</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/users/UserActivityModal', () => ({
  UserActivityModal: ({ onClose }: any) => (
    <div data-testid="activity-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockUsers = [
  {
    id: '1',
    username: 'admin',
    role: 'admin' as UserRole,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-02'),
  },
  {
    id: '2',
    username: 'manager',
    role: 'manager' as UserRole,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    username: 'cashier',
    role: 'cashier' as UserRole,
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('UserList', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders user list with correct data', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    await waitFor(() => {
      // Look for usernames specifically in the table body
      const usernameCells = document.querySelectorAll('tbody .text-sm.font-medium');
      const usernames = Array.from(usernameCells).map(cell => cell.textContent);
      
      expect(usernames).toContain('admin');
      expect(usernames).toContain('manager');
      expect(usernames).toContain('cashier');
    });
  });

  it('shows create user button for admin users', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });
  });

  it('hides create user button for non-admin users', async () => {
    render(<UserList currentUserRole="manager" />);

    await waitFor(() => {
      expect(screen.queryByText('Create User')).not.toBeInTheDocument();
    });
  });

  it('displays user roles with correct badges', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      // Get all table rows
      const rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
      
      // Check each row for the correct role badge
      const firstRowRoleBadge = rows[0].querySelectorAll('td')[1].querySelector('.rounded-full');
      const secondRowRoleBadge = rows[1].querySelectorAll('td')[1].querySelector('.rounded-full');
      const thirdRowRoleBadge = rows[2].querySelectorAll('td')[1].querySelector('.rounded-full');
      
      expect(firstRowRoleBadge?.textContent).toBe('admin');
      expect(secondRowRoleBadge?.textContent).toBe('manager');
      expect(thirdRowRoleBadge?.textContent).toBe('cashier');
    });
  });

  it('displays user status correctly', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      // Look for status badges specifically in the table
      const statusBadges = document.querySelectorAll('tbody .rounded-full');
      const statusTexts = Array.from(statusBadges).map(badge => badge.textContent);
      
      // Count active and inactive statuses
      const activeCount = statusTexts.filter(text => text === 'Active').length;
      const inactiveCount = statusTexts.filter(text => text === 'Inactive').length;
      
      expect(activeCount).toBe(2);
      expect(inactiveCount).toBe(1);
    });
  });

  it('opens create user modal when create button is clicked', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const createButton = screen.getByText('Create User');
      fireEvent.click(createButton);
    });

    expect(screen.getByTestId('create-user-form')).toBeInTheDocument();
  });

  it('opens edit user modal when edit button is clicked', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByTestId('edit-user-form')).toBeInTheDocument();
  });

  it('opens activity modal when activity button is clicked', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const activityButtons = screen.getAllByText('Activity');
      fireEvent.click(activityButtons[0]);
    });

    expect(screen.getByTestId('activity-modal')).toBeInTheDocument();
  });

  it('filters users by search term', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search users...');
      fireEvent.change(searchInput, { target: { value: 'admin' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=1&limit=20&search=admin'
      );
    });
  });

  it('filters users by role', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const roleSelect = screen.getByDisplayValue('All Roles');
      fireEvent.change(roleSelect, { target: { value: 'manager' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=1&limit=20&role=manager'
      );
    });
  });

  it('filters users by status', async () => {
    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const statusSelect = screen.getByDisplayValue('All Users');
      fireEvent.change(statusSelect, { target: { value: 'true' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=1&limit=20&isActive=true'
      );
    });
  });

  it('handles user creation successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '4', username: 'test', role: 'cashier' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [...mockUsers, { id: '4', username: 'test', role: 'cashier' }], pagination: { page: 1, limit: 20, total: 4, totalPages: 1 } }),
      });

    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const createButton = screen.getByText('Create User');
      fireEvent.click(createButton);
    });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', pin: '1234', confirmPin: '1234', role: 'cashier' }),
      });
    });
  });

  it('handles user deactivation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User deactivated' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } }),
      });

    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const deactivateButtons = screen.getAllByText('Deactivate');
      fireEvent.click(deactivateButtons[0]);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'DELETE',
      });
    });

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('handles user reactivation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User reactivated' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } }),
      });

    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      const reactivateButton = screen.getByText('Reactivate');
      fireEvent.click(reactivateButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/3/reactivate', {
        method: 'POST',
      });
    });
  });

  it('displays error message when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    render(<UserList currentUserRole="admin" />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows no users message when list is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });

    render(<UserList currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });
});