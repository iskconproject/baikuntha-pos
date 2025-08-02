'use client';

import React from 'react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { FormField, FormErrorSummary } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { ComponentErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ZodSchema } from 'zod';

interface EnhancedFormProps<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<any>;
  children: (props: {
    data: Partial<T>;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isValid: boolean;
    isValidating: boolean;
    setValue: (field: keyof T, value: any) => void;
    setValues: (values: Partial<T>) => void;
    handleBlur: (field: keyof T) => void;
    getFieldProps: (field: keyof T) => {
      value: any;
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
      onBlur: () => void;
      error?: string;
    };
    getFieldError: (field: keyof T) => string | undefined;
    hasFieldError: (field: keyof T) => boolean;
  }) => React.ReactNode;
  submitButtonText?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
  showErrorSummary?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function EnhancedForm<T extends Record<string, any>>({
  schema,
  initialData,
  onSubmit,
  children,
  submitButtonText = 'Submit',
  successMessage = 'Form submitted successfully',
  errorMessage = 'Failed to submit form',
  className = '',
  showErrorSummary = true,
  validateOnChange = true,
  validateOnBlur = true,
}: EnhancedFormProps<T>) {
  const validation = useFormValidation<T>({
    schema,
    initialData,
    validateOnChange,
    validateOnBlur,
  });

  const { executeAction, isLoading, error, success } = useActionFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const isValid = validation.validateAll();
    if (!isValid) {
      return;
    }

    await executeAction(
      () => onSubmit(validation.data as T),
      {
        successMessage,
        errorMessage,
      }
    );

    // Reset form on successful submission
    if (success) {
      validation.reset();
    }
  };

  const touchedErrors = validation.getTouchedErrors();

  return (
    <ComponentErrorBoundary>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
        {/* Error Summary */}
        {showErrorSummary && Object.keys(touchedErrors).length > 0 && (
          <FormErrorSummary errors={touchedErrors} />
        )}

        {/* API Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Submission Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error.getUserMessage()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {children({
            data: validation.data,
            errors: validation.errors,
            touched: validation.touched,
            isValid: validation.isValid,
            isValidating: validation.isValidating,
            setValue: validation.setValue,
            setValues: validation.setValues,
            handleBlur: validation.handleBlur,
            getFieldProps: validation.getFieldProps,
            getFieldError: validation.getFieldError,
            hasFieldError: validation.hasFieldError,
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading || validation.isValidating}
            loadingText="Submitting..."
          >
            {submitButtonText}
          </Button>
        </div>
      </form>
    </ComponentErrorBoundary>
  );
}