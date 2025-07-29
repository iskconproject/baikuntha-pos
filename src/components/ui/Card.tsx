'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  interactive = false,
}) => {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white shadow-lg border border-gray-100',
    outlined: 'bg-white border-2 border-gray-300',
    filled: 'bg-gray-50 border border-gray-200',
  };

  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        // Base styles
        'rounded-xl transition-all duration-200 ease-in-out',
        variants[variant],
        paddings[padding],
        // Interactive styles
        (interactive || onClick) && [
          'cursor-pointer',
          'hover:shadow-md hover:border-primary-300',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ],
        // Touch optimization
        onClick && 'touch-manipulation',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </Component>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
}) => (
  <div className={cn(
    'border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0',
    className
  )}>
    {children}
  </div>
);

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => (
  <div className={cn('flex-1', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
}) => (
  <div className={cn(
    'border-t border-gray-200 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0',
    className
  )}>
    {children}
  </div>
);