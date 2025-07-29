'use client';

import React from 'react';
import { Navigation } from './Navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userRole = 'cashier',
  className,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation userRole={userRole} />

      {/* Main Content */}
      <div className={cn(
        // Desktop: account for fixed sidebar
        'lg:pl-64',
        // Mobile: full width
        'w-full',
        className
      )}>
        {/* Content wrapper with proper spacing */}
        <main className={cn(
          // Responsive padding
          'px-4 py-6 sm:px-6 lg:px-8',
          // Account for mobile header
          'pt-6 lg:pt-8',
          // Minimum height for content area
          'min-h-screen lg:min-h-[calc(100vh-2rem)]'
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};