'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'compact' | 'comfortable' | 'spacious';
  showSidebar?: boolean;
}

export function EnhancedDashboardLayout({ 
  children, 
  className,
  layout = 'comfortable',
  showSidebar = false 
}: DashboardLayoutProps) {
  const [viewportSize, setViewportSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const updateViewportSize = () => {
      const width = window.innerWidth;
      if (width < 768) setViewportSize('sm');
      else if (width < 1024) setViewportSize('md');
      else if (width < 1280) setViewportSize('lg');
      else setViewportSize('xl');
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  const layoutClasses = {
    compact: 'gap-3',
    comfortable: 'gap-4 md:gap-6',
    spacious: 'gap-6 md:gap-8',
  };

  const containerClasses = {
    sm: 'max-w-full px-4',
    md: 'max-w-6xl px-6',
    lg: 'max-w-7xl px-6',
    xl: 'max-w-8xl px-8',
  };

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100',
      className
    )}>
      <div className={cn(
        'mx-auto py-4 md:py-6',
        containerClasses[viewportSize]
      )}>
        <div className={cn(
          'space-y-4 md:space-y-6',
          layoutClasses[layout]
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}