import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Test icon component
const TestIcon = ({ className }: { className?: string }) => (
  <svg className={className} data-testid="test-icon">
    <path d="M10 10" />
  </svg>
);

describe('DashboardWidget', () => {
  it('renders basic widget with title', () => {
    render(<DashboardWidget title="Test Widget" />);
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('renders widget with description', () => {
    render(
      <DashboardWidget 
        title="Test Widget" 
        description="This is a test description" 
      />
    );
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders widget with icon', () => {
    render(
      <DashboardWidget 
        title="Test Widget" 
        icon={TestIcon}
        iconColor="primary"
      />
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toHaveClass('h-6', 'w-6');
  });

  it('renders widget with value and subValue', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹5,000"
        subValue="25 transactions"
      />
    );
    
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('25 transactions')).toBeInTheDocument();
  });

  it('renders widget with upward trend', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹5,000"
        trend={{
          value: 15,
          direction: 'up',
          label: 'vs yesterday'
        }}
      />
    );
    
    expect(screen.getByText('+15% vs yesterday')).toBeInTheDocument();
  });

  it('renders widget with downward trend', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹4,000"
        trend={{
          value: -10,
          direction: 'down',
          label: 'vs yesterday'
        }}
      />
    );
    
    expect(screen.getByText('-10% vs yesterday')).toBeInTheDocument();
  });

  it('renders widget with neutral trend', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹5,000"
        trend={{
          value: 0,
          direction: 'neutral',
          label: 'vs yesterday'
        }}
      />
    );
    
    expect(screen.getByText('0% vs yesterday')).toBeInTheDocument();
  });

  it('renders widget with status indicator', () => {
    render(
      <DashboardWidget 
        title="System Status" 
        status={{
          label: 'All Systems Online',
          type: 'success'
        }}
      />
    );
    
    expect(screen.getByText('All Systems Online')).toBeInTheDocument();
  });

  it('renders widget with action button (href)', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        action={{
          label: 'Go to Sales',
          href: '/sales'
        }}
      />
    );
    
    const actionButton = screen.getByRole('button', { name: 'Go to Sales' });
    expect(actionButton).toBeInTheDocument();
    expect(actionButton).toHaveAttribute('href', '/sales');
  });

  it('renders widget with action button (onClick)', () => {
    const mockOnClick = vi.fn();
    
    render(
      <DashboardWidget 
        title="Test Widget" 
        action={{
          label: 'Click Me',
          onClick: mockOnClick
        }}
      />
    );
    
    const actionButton = screen.getByRole('button', { name: 'Click Me' });
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it('renders disabled action button', () => {
    render(
      <DashboardWidget 
        title="Test Widget" 
        action={{
          label: 'Coming Soon',
          disabled: true
        }}
      />
    );
    
    const actionButton = screen.getByRole('button', { name: 'Coming Soon' });
    expect(actionButton).toBeInTheDocument();
    expect(actionButton).toBeDisabled();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <DashboardWidget title="Small Widget" size="sm" />
    );
    
    // Check small size (default test, hard to test padding directly)
    expect(screen.getByText('Small Widget')).toBeInTheDocument();
    
    rerender(<DashboardWidget title="Large Widget" size="lg" icon={TestIcon} />);
    
    // Large size should have larger icon
    expect(screen.getByTestId('test-icon')).toHaveClass('h-8', 'w-8');
  });

  it('applies custom className', () => {
    render(
      <DashboardWidget 
        title="Custom Widget" 
        className="custom-class"
      />
    );
    
    const widget = screen.getByText('Custom Widget').closest('.custom-class');
    expect(widget).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <DashboardWidget title="Widget with Children">
        <div data-testid="custom-content">Custom content here</div>
      </DashboardWidget>
    );
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content here')).toBeInTheDocument();
  });

  it('applies correct icon color classes', () => {
    const { rerender } = render(
      <DashboardWidget 
        title="Primary Widget" 
        icon={TestIcon}
        iconColor="primary"
      />
    );
    
    let iconContainer = screen.getByTestId('test-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-primary-100', 'text-primary-600');
    
    rerender(
      <DashboardWidget 
        title="Success Widget" 
        icon={TestIcon}
        iconColor="success"
      />
    );
    
    iconContainer = screen.getByTestId('test-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-success-100', 'text-success-600');
    
    rerender(
      <DashboardWidget 
        title="Warning Widget" 
        icon={TestIcon}
        iconColor="warning"
      />
    );
    
    iconContainer = screen.getByTestId('test-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-warning-100', 'text-warning-600');
    
    rerender(
      <DashboardWidget 
        title="Error Widget" 
        icon={TestIcon}
        iconColor="error"
      />
    );
    
    iconContainer = screen.getByTestId('test-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-error-100', 'text-error-600');
  });

  it('renders multiple status types correctly', () => {
    const { rerender } = render(
      <DashboardWidget 
        title="Success Status" 
        status={{
          label: 'All Good',
          type: 'success'
        }}
      />
    );
    
    expect(screen.getByText('All Good')).toHaveClass('text-success-600');
    
    rerender(
      <DashboardWidget 
        title="Warning Status" 
        status={{
          label: 'Attention Needed',
          type: 'warning'
        }}
      />
    );
    
    expect(screen.getByText('Attention Needed')).toHaveClass('text-warning-600');
    
    rerender(
      <DashboardWidget 
        title="Error Status" 
        status={{
          label: 'System Error',
          type: 'error'
        }}
      />
    );
    
    expect(screen.getByText('System Error')).toHaveClass('text-error-600');
  });

  it('handles numeric values correctly', () => {
    render(
      <DashboardWidget 
        title="Numeric Widget" 
        value={150}
        subValue="items"
      />
    );
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    render(<DashboardWidget title="Minimal Widget" />);
    
    expect(screen.getByText('Minimal Widget')).toBeInTheDocument();
    // Should not crash and should render basic structure
    expect(screen.getByText('Minimal Widget').closest('div')).toBeInTheDocument();
  });
});