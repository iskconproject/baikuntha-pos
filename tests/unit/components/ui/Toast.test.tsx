import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, ToastContainer } from '@/components/ui/Toast';
import type { ToastProps } from '@/components/ui/Toast';

describe('Toast', () => {
  const mockOnClose = vi.fn();
  const defaultProps: ToastProps = {
    id: 'test-toast',
    type: 'success',
    title: 'Test Toast',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast with title', () => {
    render(<Toast {...defaultProps} />);

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('should render toast with message', () => {
    render(<Toast {...defaultProps} message="Test message" />);

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success toast with correct icon and styling', () => {
    render(<Toast {...defaultProps} type="success" />);

    const toast = screen.getByText('Test Toast').closest('div');
    expect(toast).toHaveClass('border-green-200', 'bg-green-50');
  });

  it('should render error toast with correct icon and styling', () => {
    render(<Toast {...defaultProps} type="error" />);

    const toast = screen.getByText('Test Toast').closest('div');
    expect(toast).toHaveClass('border-red-200', 'bg-red-50');
  });

  it('should render warning toast with correct icon and styling', () => {
    render(<Toast {...defaultProps} type="warning" />);

    const toast = screen.getByText('Test Toast').closest('div');
    expect(toast).toHaveClass('border-yellow-200', 'bg-yellow-50');
  });

  it('should render info toast with correct icon and styling', () => {
    render(<Toast {...defaultProps} type="info" />);

    const toast = screen.getByText('Test Toast').closest('div');
    expect(toast).toHaveClass('border-blue-200', 'bg-blue-50');
  });

  it('should render action button when provided', () => {
    const mockAction = vi.fn();
    render(
      <Toast
        {...defaultProps}
        action={{
          label: 'Undo',
          onClick: mockAction,
        }}
      />
    );

    const actionButton = screen.getByText('Undo');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('should call onClose when close button is clicked', () => {
    render(<Toast {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('should auto-close after duration', async () => {
    render(<Toast {...defaultProps} duration={1000} />);

    expect(mockOnClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });
  });

  it('should not auto-close when duration is 0', () => {
    render(<Toast {...defaultProps} duration={0} />);

    vi.advanceTimersByTime(10000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should show entrance animation', async () => {
    render(<Toast {...defaultProps} />);

    const toast = screen.getByText('Test Toast').closest('div');
    
    // Initially should have translate-x-full (off-screen)
    expect(toast).toHaveClass('translate-x-full', 'opacity-0');

    // After a short delay, should animate in
    await waitFor(() => {
      expect(toast).toHaveClass('translate-x-0', 'opacity-100');
    });
  });

  it('should show exit animation when closing', async () => {
    render(<Toast {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    const toast = screen.getByText('Test Toast').closest('div');
    expect(toast).toHaveClass('translate-x-full', 'opacity-0');

    // Should call onClose after animation delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    }, { timeout: 500 });
  });
});

describe('ToastContainer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render multiple toasts', () => {
    const toasts: ToastProps[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Success Toast',
        onClose: mockOnClose,
      },
      {
        id: 'toast-2',
        type: 'error',
        title: 'Error Toast',
        onClose: mockOnClose,
      },
    ];

    render(<ToastContainer toasts={toasts} onClose={mockOnClose} />);

    expect(screen.getByText('Success Toast')).toBeInTheDocument();
    expect(screen.getByText('Error Toast')).toBeInTheDocument();
  });

  it('should render empty container when no toasts', () => {
    const { container } = render(<ToastContainer toasts={[]} onClose={mockOnClose} />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.childNodes).toHaveLength(1); // Just the wrapper div
  });

  it('should pass onClose to individual toasts', () => {
    const toasts: ToastProps[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Test Toast',
        onClose: mockOnClose,
      },
    ];

    render(<ToastContainer toasts={toasts} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith('toast-1');
  });

  it('should have correct ARIA attributes', () => {
    const toasts: ToastProps[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Test Toast',
        onClose: mockOnClose,
      },
    ];

    render(<ToastContainer toasts={toasts} onClose={mockOnClose} />);

    const container = screen.getByRole('region', { hidden: true });
    expect(container).toHaveAttribute('aria-live', 'assertive');
  });

  it('should stack toasts vertically', () => {
    const toasts: ToastProps[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Toast 1',
        onClose: mockOnClose,
      },
      {
        id: 'toast-2',
        type: 'error',
        title: 'Toast 2',
        onClose: mockOnClose,
      },
    ];

    render(<ToastContainer toasts={toasts} onClose={mockOnClose} />);

    const wrapper = screen.getByText('Toast 1').closest('div')?.parentElement;
    expect(wrapper).toHaveClass('space-y-4');
  });
});