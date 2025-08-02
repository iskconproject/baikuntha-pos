'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function FormField({
  label,
  error,
  success,
  hint,
  required = false,
  children,
  className = '',
  id,
}: FormFieldProps) {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-invalid': error ? 'true' : 'false',
          'aria-describedby': error ? `${fieldId}-error` : success ? `${fieldId}-success` : hint ? `${fieldId}-hint` : undefined,
          className: `${(children as React.ReactElement).props.className || ''} ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
            success ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
          }`.trim(),
        })}
        
        {/* Success icon */}
        {success && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        )}
        
        {/* Error icon */}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-red-600 flex items-center"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Success message */}
      {success && !error && (
        <p
          id={`${fieldId}-success`}
          className="text-sm text-green-600 flex items-center"
        >
          <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {success}
        </p>
      )}

      {/* Hint text */}
      {hint && !error && !success && (
        <p
          id={`${fieldId}-hint`}
          className="text-sm text-gray-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export interface ValidationMessageProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

export function ValidationMessage({ type, message, className = '' }: ValidationMessageProps) {
  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className={`flex items-center p-3 text-sm border rounded-md ${getStyles()} ${className}`}>
      <div className="flex-shrink-0 mr-2">
        {getIcon()}
      </div>
      <div>{message}</div>
    </div>
  );
}

export interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export function FormErrorSummary({ errors, className = '' }: FormErrorSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([, message]) => message);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please correct the following errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {errorEntries.map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}