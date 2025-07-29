import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary-600');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-100');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-error-600');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-700');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-gray-300');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[48px]');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[52px]');
    });

    it('renders with icon', () => {
      const icon = <span data-testid="icon">🔥</span>;
      render(<Button icon={icon}>With Icon</Button>);
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders icon in correct position', () => {
      const icon = <span data-testid="icon">🔥</span>;
      const { rerender } = render(
        <Button icon={icon} iconPosition="left">Left Icon</Button>
      );
      
      const button = screen.getByRole('button');
      const iconElement = screen.getByTestId('icon');
      
      // Icon should come before text in DOM order for left position
      const iconWrapper = iconElement.parentElement;
      expect(button.firstChild).toBe(iconWrapper);

      rerender(<Button icon={icon} iconPosition="right">Right Icon</Button>);
      
      const rightButton = screen.getByRole('button');
      const rightIconElement = screen.getByTestId('icon');
      const rightIconWrapper = rightIconElement.parentElement;
      
      // Icon should come after text for right position
      expect(rightButton.lastChild).toBe(rightIconWrapper);
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      
      // Should have loading spinner
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('shows custom loading text', () => {
      render(<Button loading loadingText="Saving...">Save</Button>);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('hides icon when loading', () => {
      const icon = <span data-testid="icon">🔥</span>;
      render(<Button loading icon={icon}>Loading</Button>);
      
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be activated with keyboard', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Keyboard Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button id="test-button">Accessible Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'test-button');
    });

    it('has proper focus management', () => {
      render(<Button>Focus Test</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus:outline-none');
    });

    it('has minimum touch target size', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[48px]');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[52px]');
    });

    it('provides screen reader feedback for loading state', () => {
      render(<Button loading id="loading-btn">Loading</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'loading-btn-loading');
      
      const loadingText = screen.getByText('Loading, please wait');
      expect(loadingText).toHaveClass('sr-only');
    });
  });

  describe('Custom Props', () => {
    it('forwards additional props', () => {
      render(<Button data-testid="custom-button" title="Custom Title">Custom</Button>);
      
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Custom Title');
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom Class</Button>);
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});