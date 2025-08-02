'use client';

import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    success,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    showPasswordToggle = false,
    className = '',
    type = 'text',
    id,
    required = false,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;

    const getVariantStyles = () => {
      const baseStyles = 'block w-full rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
      
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

    const inputClasses = `
      ${getVariantStyles()}
      ${getSizeStyles()}
      ${getStateStyles()}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || error || success || (isPassword && showPasswordToggle) ? 'pr-10' : ''}
      ${className}
    `.trim();

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-gray-400">
                {leftIcon}
              </div>
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={inputClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : 
              success ? `${inputId}-success` : 
              hint ? `${inputId}-hint` : undefined
            }
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute inset-y-0 right-0 flex items-center">
            {/* Password Toggle */}
            {isPassword && showPasswordToggle && (
              <button
                type="button"
                className="px-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Success Icon */}
            {success && !error && (
              <div className="px-3 pointer-events-none">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}

            {/* Error Icon */}
            {error && (
              <div className="px-3 pointer-events-none">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}

            {/* Custom Right Icon */}
            {rightIcon && !error && !success && !(isPassword && showPasswordToggle) && (
              <div className="px-3 pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
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
            id={`${inputId}-success`}
            className="text-sm text-green-600 flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            {success}
          </p>
        )}

        {/* Hint Text */}
        {hint && !error && !success && (
          <p
            id={`${inputId}-hint`}
            className="text-sm text-gray-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';