import React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium text-gray-700',
              // Touch-friendly label sizing to match Input
              'sm:text-base'
            )}
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            // Base styles matching Input component
            'flex w-full rounded-lg border bg-white px-3 py-2.5 text-sm',
            'transition-all duration-200 ease-in-out',
            // Touch optimization - minimum 44px height to match Input
            'min-h-[44px] sm:min-h-[48px]',
            'sm:text-base sm:py-3',
            // Focus and interaction states
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            // Default state
            !error && [
              'border-gray-300',
              'focus:border-orange-500 focus:ring-orange-500'
            ],
            // Error state
            error && [
              'border-red-500',
              'focus:border-red-500 focus:ring-red-500'
            ],
            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Error message */}
        {error && (
          <p
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';