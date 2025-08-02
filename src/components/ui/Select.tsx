'use client';

import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    success,
    hint,
    options,
    placeholder,
    variant = 'default',
    inputSize = 'md',
    className = '',
    id,
    required = false,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const getVariantStyles = () => {
      const baseStyles = 'block w-full rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 appearance-none';
      
      switch (variant) {
        case 'filled':
          return `${baseStyles} bg-gray-50 border-0 focus:bg-white focus:ring-orange-500`;
        case 'outline':
          return `${baseStyles} bg-transparent border-2 focus:ring-orange-500`;
        default:
          return `${baseStyles} border border-gray-300 focus:ring-orange-500 focus:border-orange-500`;
      }
    };

    const getSizeStyles = () => {
      switch (inputSize) {
        case 'sm':
          return 'px-3 py-2 text-sm min-h-[40px]';
        case 'lg':
          return 'px-4 py-3 text-lg min-h-[52px]';
        default:
          return 'px-3 py-2.5 text-base min-h-[44px] sm:min-h-[48px]';
      }
    };

    const getStateStyles = () => {
      if (error) {
        return 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50';
      }
      if (success) {
        return 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50';
      }
      return '';
    };

    const selectClasses = `
      ${getVariantStyles()}
      ${getSizeStyles()}
      ${getStateStyles()}
      pr-10
      ${className}
    `.trim();

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${selectId}-error` : 
              success ? `${selectId}-success` : 
              hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            {error ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${selectId}-error`}
            className="text-sm text-red-600 flex items-center"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={`${selectId}-success`}
            className="text-sm text-green-600 flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            {success}
          </p>
        )}

        {/* Hint Text */}
        {hint && !error && !success && (
          <p
            id={`${selectId}-hint`}
            className="text-sm text-gray-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';