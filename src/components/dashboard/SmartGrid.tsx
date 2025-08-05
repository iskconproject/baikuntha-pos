'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SmartGridProps {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
  autoFit?: boolean;
}

export function SmartGrid({ 
  children, 
  className,
  minItemWidth = 280,
  maxColumns = 4,
  gap = 'md',
  autoFit = true 
}: SmartGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };

  // Auto-fit grid that adjusts based on content and screen size
  const gridStyle = autoFit ? {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
    gridAutoRows: 'min-content',
  } : {};

  const gridClasses = autoFit 
    ? gapClasses[gap]
    : cn(
        'grid',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        'auto-rows-fr',
        gapClasses[gap]
      );

  return (
    <div 
      className={cn(gridClasses, className)}
      style={autoFit ? gridStyle : undefined}
    >
      {children}
    </div>
  );
}