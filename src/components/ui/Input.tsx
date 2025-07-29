import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-gray-700',
              // Touch-friendly label sizing
              'sm:text-base',
              required && "after:content-['*'] after:ml-0.5 after:text-error-500"
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              // Base styles
              'flex w-full rounded-lg border bg-white px-3 py-2.5 text-sm',
              'placeholder:text-gray-400',
              'transition-all duration-200 ease-in-out',
              // Touch optimization - minimum 44px height
              'min-h-[44px] sm:min-h-[48px]',
              'sm:text-base sm:py-3',
              // Focus and interaction states
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              // Default state
              !error && [
                'border-gray-300',
                'focus:border-primary-500 focus:ring-primary-500'
              ],
              // Error state
              error && [
                'border-error-500 pr-10',
                'focus:border-error-500 focus:ring-error-500'
              ],
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              helperText && helperId
            ).trim() || undefined}
            aria-required={required}
            {...props}
          />
          
          {/* Error icon */}
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-error-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-error-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p
            id={helperId}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';