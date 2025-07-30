import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditUserForm } from '@/components/forms/EditUserForm';
import type { UserRole } from '@/types/auth';

const mockUser = {
  id: '1',
  username: 'testuser',
  role: 'cashier' as UserRole,
  isActive: true,
};

describe('EditUserForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with pre-filled user data', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    
    // Check that the role select has the correct value
    const roleSelect = screen.getByLabelText('Role');
    expect(roleSelect).toHaveValue('cashier');
  });

  it('renders form buttons', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Update User')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates form fields when user types', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'updateduser' } });
    expect(usernameInput).toHaveValue('updateduser');

    const roleSelect = screen.getByLabelText('Role');
    fireEvent.change(roleSelect, { target: { value: 'manager' } });
    expect(roleSelect).toHaveValue('manager');
  });

  it('submits only changed fields', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Change only the username
    fireEvent.change(screen.getByDisplayValue('testuser'), { target: { value: 'updateduser' } });

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'updateduser',
      });
    });
  });

  it('submits multiple changed fields', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Change both username and role
    fireEvent.change(screen.getByDisplayValue('testuser'), { target: { value: 'updateduser' } });
    fireEvent.change(screen.getByLabelTextlue('cashier'), { target: { value: 'manager' } });

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'updateduser',
        role: 'manager',
      });
    });
  });

  it('closes form when no changes are made', async () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Submit without making any changes
    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('displays validation errors for invalid data', async () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Set invalid username (too short)
    fireEvent.change(screen.getByDisplayValue('testuser'), { target: { value: 'ab' } });

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('clears errors when user starts typing', async () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Set invalid username to trigger error
    fireEvent.change(screen.getByDisplayValue('testuser'), { target: { value: 'ab' } });
    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(screen.getByDisplayValue('ab'), { target: { value: 'abc' } });

    await waitFor(() => {
      expect(screen.queryByText('Username must be at least 3 characters')).not.toBeInTheDocument();
    });
  });

  it('disables form when loading', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    expect(screen.getByDisplayValue('testuser')).toBeDisabled();
    expect(screen.getByDisplayValue('cashier')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('shows loading state on submit button when loading', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /update user/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays helper text for form fields', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('3-20 characters, letters, numbers, and underscores only')).toBeInTheDocument();
    expect(screen.getByText('Select the user\'s access level')).toBeInTheDocument();
  });

  it('validates username format', async () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Test with invalid username (special characters)
    fireEvent.change(screen.getByDisplayValue('testuser'), { target: { value: 'test@user' } });

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
    });
  });

  it('handles all role options', () => {
    render(
      <EditUserForm
        user={mockUser}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const roleSelect = screen.getByDisplayValue('cashier');
    
    // Test changing to admin
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    expect(roleSelect).toHaveValue('admin');

    // Test changing to manager
    fireEvent.change(roleSelect, { target: { value: 'manager' } });
    expect(roleSelect).toHaveValue('manager');

    // Test changing back to cashier
    fireEvent.change(roleSelect, { target: { value: 'cashier' } });
    expect(roleSelect).toHaveValue('cashier');
  });
});