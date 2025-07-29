import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'text-primary-600', 'h-6', 'w-6');
      
      const label = screen.getByText('Loading...', { selector: '.sr-only' });
      expect(label).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      expect(screen.getByRole('img', { hidden: true })).toHaveClass('h-4', 'w-4');

      rerender(<LoadingSpinner size="md" />);
      expect(screen.getByRole('img', { hidden: true })).toHaveClass('h-6', 'w-6');

      rerender(<LoadingSpinner size="lg" />);
      expect(screen.getByRole('img', { hidden: true })).toHaveClass('h-8', 'w-8');

      rerender(<LoadingSpinner size="xl" />);
      expect(screen.getByRole('img', { hidden: true })).toHaveClass('h-12', 'w-12');
    });

    it('renders with custom label', () => {
      render(<LoadingSpinner label="Processing..." />);
      
      const label = screen.getByText('Processing...', { selector: '.sr-only' });
      expect(label).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />);
      
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toHaveClass('custom-spinner');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides screen reader text', () => {
      render(<LoadingSpinner label="Loading data" />);
      
      const srText = screen.getByText('Loading data');
      expect(srText).toHaveClass('sr-only');
    });

    it('uses semantic SVG structure', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner.tagName).toBe('svg');
      expect(spinner).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(spinner).toHaveAttribute('fill', 'none');
      expect(spinner).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });

  describe('Visual Structure', () => {
    it('has correct container structure', () => {
      render(<LoadingSpinner />);
      
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('has spinning animation', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });

    it('uses primary color theme', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveClass('text-primary-600');
    });

    it('has proper SVG paths for spinner', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      const circle = spinner.querySelector('circle');
      const path = spinner.querySelector('path');
      
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveAttribute('cx', '12');
      expect(circle).toHaveAttribute('cy', '12');
      expect(circle).toHaveAttribute('r', '10');
      expect(circle).toHaveClass('opacity-25');
      
      expect(path).toBeInTheDocument();
      expect(path).toHaveClass('opacity-75');
    });
  });

  describe('Props Handling', () => {
    it('handles undefined size gracefully', () => {
      render(<LoadingSpinner size={undefined} />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveClass('h-6', 'w-6'); // Should default to 'md'
    });

    it('handles empty label', () => {
      render(<LoadingSpinner label="" />);
      
      const srText = screen.getByText('', { selector: '.sr-only' });
      expect(srText).toBeInTheDocument();
    });

    it('combines custom className with default classes', () => {
      render(<LoadingSpinner className="my-custom-class" />);
      
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'my-custom-class');
    });
  });

  describe('Theme Integration', () => {
    it('uses temple theme colors', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveClass('text-primary-600');
    });

    it('maintains consistent styling across sizes', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<LoadingSpinner size={size} />);
        const spinner = screen.getByRole('img', { hidden: true });
        
        expect(spinner).toHaveClass('animate-spin', 'text-primary-600');
        unmount();
      });
    });
  });
});