import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, required, rows = 3, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium text-gray-700',
              // Touch-friendly label sizing
              'sm:text-base',
              required && "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            id={textareaId}
            ref={ref}
            rows={rows}
            className={cn(
              // Base styles matching Input component
              'flex w-full rounded-lg border bg-white px-3 py-2.5 text-sm',
              'placeholder:text-gray-400',
              'transition-all duration-200 ease-in-out',
              // Touch optimization - consistent with other inputs
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
                'border-red-500 pr-10',
                'focus:border-red-500 focus:ring-red-500'
              ],
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              // Resize behavior
              'resize-vertical',
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
            <div className="absolute top-3 right-0 pr-3 flex items-start pointer-events-none">
              <svg
                className="h-5 w-5 text-red-500"
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
            className="text-sm text-red-600"
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

Textarea.displayName = 'Textarea';