import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserForm } from '@/components/forms/CreateUserForm';
import type { CreateUserInput } from '@/lib/validation/user';

describe('CreateUserForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByLabelText('PIN')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm PIN')).toBeInTheDocument();
  });

  it('renders form buttons', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates form fields when user types', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(usernameInput).toHaveValue('testuser');

    const pinInput = screen.getByLabelText('PIN');
    fireEvent.change(pinInput, { target: { value: '1234' } });
    expect(pinInput).toHaveValue('1234');

    const confirmPinInput = screen.getByLabelText('Confirm PIN');
    fireEvent.change(confirmPinInput, { target: { value: '1234' } });
    expect(confirmPinInput).toHaveValue('1234');
  });

  it('updates role selection', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const roleSelect = screen.getByLabelText('Role');
    fireEvent.change(roleSelect, { target: { value: 'manager' } });
    expect(roleSelect).toHaveValue('manager');
  });

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'manager' } });
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '1234' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        role: 'manager',
        pin: '1234',
        confirmPin: '1234',
      });
    });
  });

  it('displays validation errors for invalid data', async () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Submit form without filling required fields
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('PIN must be at least 4 digits')).toBeInTheDocument();
    });
  });

  it('displays error when PINs do not match', async () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill form with mismatched PINs
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '5678' } });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText("PINs don't match")).toBeInTheDocument();
    });
  });

  it('clears errors when user starts typing', async () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Submit to trigger validation errors
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });

    // Start typing in username field
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.queryByText('Username must be at least 3 characters')).not.toBeInTheDocument();
    });
  });

  it('disables form when loading', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByLabelText('Role')).toBeDisabled();
    expect(screen.getByLabelText('PIN')).toBeDisabled();
    expect(screen.getByLabelText('Confirm PIN')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('shows loading state on submit button when loading', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create user/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays helper text for form fields', () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('3-20 characters, letters, numbers, and underscores only')).toBeInTheDocument();
    expect(screen.getByText('Select the user\'s access level')).toBeInTheDocument();
    expect(screen.getByText('4-8 digits, no sequential or repeated numbers')).toBeInTheDocument();
  });

  it('validates PIN complexity', async () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Test with weak PIN (repeated digits)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1111' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '1111' } });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('PIN cannot be all the same digit')).toBeInTheDocument();
    });
  });

  it('validates username format', async () => {
    render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Test with invalid username (special characters)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'test@user' } });
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '1234' } });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
    });
  });
});