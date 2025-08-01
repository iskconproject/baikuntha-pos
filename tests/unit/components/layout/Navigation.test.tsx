import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '@/components/layout/Navigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/sales',
}));

describe('Navigation Component', () => {
  beforeEach(() => {
    // Reset any DOM modifications
    document.body.style.overflow = '';
  });

  describe('Desktop Navigation', () => {
    it('renders desktop navigation with brand', () => {
      render(<Navigation userRole="admin" />);
      
      expect(screen.getByText('BaikunthaPOS')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('shows navigation items based on user role', () => {
      const { rerender } = render(<Navigation userRole="cashier" />);
      
      // Cashier should only see Sales
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
      expect(screen.queryByText('Users')).not.toBeInTheDocument();

      rerender(<Navigation userRole="manager" />);
      
      // Manager should see Sales, Inventory, Reports
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.queryByText('Users')).not.toBeInTheDocument();

      rerender(<Navigation userRole="admin" />);
      
      // Admin should see all items
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('highlights active navigation item', () => {
      render(<Navigation userRole="admin" />);
      
      const salesLink = screen.getByRole('link', { name: /sales/i });
      expect(salesLink).toHaveClass('bg-primary-100');
      expect(salesLink).toHaveAttribute('aria-current', 'page');
    });

    it('has logout button', () => {
      render(<Navigation userRole="admin" />);
      
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('renders mobile header with menu button', () => {
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens mobile menu when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes mobile menu when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      // Open menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Click backdrop
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
      
      if (backdrop) {
        await user.click(backdrop);
      }
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile menu when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      // Open menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Click close button
      const closeButton = screen.getByLabelText('Close menu');
      await user.click(closeButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile menu on escape key', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      // Open menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Press escape
      await user.keyboard('{Escape}');
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for navigation', () => {
      render(<Navigation userRole="admin" />);
      
      const salesLink = screen.getByRole('link', { name: /sales/i });
      expect(salesLink).toHaveAttribute('aria-current', 'page');
    });

    it('has proper focus management for mobile menu', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Menu should be focusable
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has minimum touch target sizes for mobile', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveClass('min-h-[44px]');
      expect(menuButton).toHaveClass('min-w-[44px]');
      
      // Open mobile menu to check mobile links
      await user.click(menuButton);
      
      const mobileLinks = screen.getAllByRole('link');
      mobileLinks.forEach(link => {
        if (link.closest('[role="dialog"]')) {
          expect(link).toHaveClass('min-h-[48px]');
        }
      });
    });

    it('provides proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      menuButton.focus();
      
      expect(menuButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Touch Optimization', () => {
    it('has touch-optimized button sizes', () => {
      render(<Navigation userRole="admin" />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveClass('min-h-[44px]');
      expect(menuButton).toHaveClass('min-w-[44px]');
    });

    it('has proper spacing for touch targets', async () => {
      const user = userEvent.setup();
      render(<Navigation userRole="admin" />);
      
      // Open mobile menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Check mobile navigation links have proper spacing
      const mobileNavigation = screen.getByRole('dialog');
      const links = mobileNavigation.querySelectorAll('a');
      
      links.forEach(link => {
        expect(link).toHaveClass('min-h-[48px]');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('hides desktop navigation on mobile screens', () => {
      render(<Navigation userRole="admin" />);
      
      // Desktop navigation should have lg:flex class
      const desktopNav = document.querySelector('.lg\\:flex');
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav).toHaveClass('hidden');
    });

    it('hides mobile navigation on desktop screens', () => {
      render(<Navigation userRole="admin" />);
      
      // Mobile navigation should have lg:hidden class
      const mobileNav = document.querySelector('.lg\\:hidden');
      expect(mobileNav).toBeInTheDocument();
    });
  });

  describe('Brand and User Info', () => {
    it('displays brand logo and name consistently', () => {
      render(<Navigation userRole="manager" />);
      
      // Should appear in both desktop and mobile
      const brandElements = screen.getAllByText('BaikunthaPOS');
      expect(brandElements.length).toBeGreaterThanOrEqual(1);
      
      // Check for logo
      const logos = document.querySelectorAll('[class*="bg-primary-600"]');
      expect(logos.length).toBeGreaterThan(0);
    });

    it('displays user role information', () => {
      render(<Navigation userRole="manager" />);
      
      expect(screen.getByText('manager')).toBeInTheDocument();
    });
  });
});