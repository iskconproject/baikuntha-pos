import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    loadingText,
    disabled, 
    children, 
    icon,
    iconPosition = 'left',
    ...props 
  }, ref) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      // Touch optimization
      'touch-manipulation',
      // Ensure minimum touch target size (44px)
      size === 'sm' ? 'min-h-[44px]' : size === 'md' ? 'min-h-[48px]' : 'min-h-[52px]'
    );
    
    const variants = {
      primary: cn(
        'bg-primary-600 text-white shadow-sm',
        'hover:bg-primary-700 active:bg-primary-800',
        'focus:ring-primary-500',
        'disabled:bg-primary-300'
      ),
      secondary: cn(
        'bg-gray-100 text-gray-900 shadow-sm',
        'hover:bg-gray-200 active:bg-gray-300',
        'focus:ring-gray-500',
        'disabled:bg-gray-50'
      ),
      danger: cn(
        'bg-error-600 text-white shadow-sm',
        'hover:bg-error-700 active:bg-error-800',
        'focus:ring-error-500',
        'disabled:bg-error-300'
      ),
      ghost: cn(
        'text-gray-700',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus:ring-gray-500'
      ),
      outline: cn(
        'border border-gray-300 bg-white text-gray-700 shadow-sm',
        'hover:bg-gray-50 active:bg-gray-100',
        'focus:ring-gray-500',
        'disabled:border-gray-200'
      ),
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm gap-2',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-3',
    };

    const isDisabled = disabled || loading;
    const buttonText = loading && loadingText ? loadingText : children;
    
    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-describedby={loading ? `${props.id}-loading` : undefined}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {/* Left icon */}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span className={loading ? 'sr-only sm:not-sr-only' : ''}>
          {buttonText}
        </span>
        
        {/* Right icon */}
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        
        {/* Screen reader loading text */}
        {loading && (
          <span id={`${props.id}-loading`} className="sr-only">
            Loading, please wait
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';