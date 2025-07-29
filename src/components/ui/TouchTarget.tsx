'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TouchTargetProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'button' | 'icon' | 'card';
}

/**
 * TouchTarget component ensures minimum 44px touch target size
 * for better mobile accessibility and usability
 */
export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  size = 'md',
  className,
  onClick,
  disabled = false,
  variant = 'button',
}) => {
  const sizes = {
    sm: 'min-h-[44px] min-w-[44px]',
    md: 'min-h-[48px] min-w-[48px]',
    lg: 'min-h-[52px] min-w-[52px]',
  };

  const variants = {
    button: cn(
      'inline-flex items-center justify-center',
      'rounded-lg font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      !disabled && 'hover:bg-gray-100 active:bg-gray-200',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    icon: cn(
      'inline-flex items-center justify-center',
      'rounded-full transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      !disabled && 'hover:bg-gray-100 active:bg-gray-200',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    card: cn(
      'flex items-center justify-center',
      'rounded-xl transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      !disabled && 'hover:shadow-md active:scale-[0.98]',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        sizes[size],
        variants[variant],
        'touch-manipulation',
        className
      )}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      type={onClick ? 'button' : undefined}
      role={onClick && !Component ? 'button' : undefined}
      tabIndex={onClick && !Component ? 0 : undefined}
      onKeyDown={onClick && !Component ? (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-disabled={disabled}
    >
      {children}
    </Component>
  );
};