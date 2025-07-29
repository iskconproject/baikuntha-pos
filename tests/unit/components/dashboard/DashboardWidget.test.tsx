import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';

// Mock icon component
const MockIcon = ({ className }: { className?: string }) => (
  <div data-testid="mock-icon" className={className}>Icon</div>
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
        icon={MockIcon}
        iconColor="primary"
      />
    );
    
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toHaveClass('h-6', 'w-6');
  });

  it('renders widget with value and subValue', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹1,234"
        subValue="5 transactions"
      />
    );
    
    expect(screen.getByText('₹1,234')).toBeInTheDocument();
    expect(screen.getByText('5 transactions')).toBeInTheDocument();
  });

  it('renders widget with trend information', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹1,234"
        trend={{
          value: 15,
          direction: 'up',
          label: 'vs yesterday'
        }}
      />
    );
    
    expect(screen.getByText('+15% vs yesterday')).toBeInTheDocument();
  });

  it('renders widget with down trend', () => {
    render(
      <DashboardWidget 
        title="Sales Widget" 
        value="₹1,234"
        trend={{
          value: 10,
          direction: 'down',
          label: 'vs yesterday'
        }}
      />
    );
    
    expect(screen.getByText('+10% vs yesterday')).toBeInTheDocument();
  });

  it('renders widget with status indicator', () => {
    render(
      <DashboardWidget 
        title="System Status" 
        status={{
          label: 'Online',
          type: 'success'
        }}
      />
    );
    
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders widget with action button', () => {
    const mockClick = vi.fn();
    
    render(
      <DashboardWidget 
        title="Test Widget" 
        action={{
          label: 'Click Me',
          onClick: mockClick
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Click Me' });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('renders widget with disabled action button', () => {
    render(
      <DashboardWidget 
        title="Test Widget" 
        action={{
          label: 'Disabled Action',
          disabled: true
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Disabled Action' });
    expect(button).toBeDisabled();
  });

  it('renders widget with link action', () => {
    render(
      <DashboardWidget 
        title="Test Widget" 
        action={{
          label: 'Go to Page',
          href: '/test-page'
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Go to Page' });
    expect(button).toHaveAttribute('href', '/test-page');
  });

  it('renders widget with custom children', () => {
    render(
      <DashboardWidget title="Custom Widget">
        <div data-testid="custom-content">Custom Content</div>
      </DashboardWidget>
    );
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <DashboardWidget title="Small Widget" size="sm" />
    );
    
    // Test small size
    expect(screen.getByText('Small Widget')).toHaveClass('text-base');
    
    // Test large size
    rerender(<DashboardWidget title="Large Widget" size="lg" />);
    expect(screen.getByText('Large Widget')).toHaveClass('text-xl');
  });

  it('applies different icon colors correctly', () => {
    render(
      <DashboardWidget 
        title="Colored Widget" 
        icon={MockIcon}
        iconColor="success"
      />
    );
    
    const iconContainer = screen.getByTestId('mock-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-success-100', 'text-success-600');
  });

  it('renders all status types correctly', () => {
    const statusTypes = ['success', 'warning', 'error', 'info'] as const;
    
    statusTypes.forEach((type) => {
      const { unmount } = render(
        <DashboardWidget 
          title={`${type} Widget`}
          status={{
            label: `${type} status`,
            type
          }}
        />
      );
      
      expect(screen.getByText(`${type} status`)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles hover effects', () => {
    render(<DashboardWidget title="Hover Widget" />);
    
    const widget = screen.getByText('Hover Widget').closest('.hover\\:shadow-lg');
    expect(widget).toHaveClass('hover:shadow-lg', 'transition-shadow');
  });
});