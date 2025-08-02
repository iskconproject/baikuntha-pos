'use client';

import { useState, useCallback, useEffect } from 'react';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationState<T> {
  data: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isValidating: boolean;
}

export interface UseFormValidationOptions<T> {
  schema: ZodSchema<T>;
  initialData?: Partial<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  initialData = {},
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
}: UseFormValidationOptions<T>) {
  const [state, setState] = useState<ValidationState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isValid: false,
    isValidating: false,
  });

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Validate data against schema
  const validateData = useCallback(
    (data: Partial<T>, field?: keyof T): { errors: Record<string, string>; isValid: boolean } => {
      try {
        schema.parse(data);
        return { errors: {}, isValid: true };
      } catch (error) {
        if (error instanceof ZodError) {
          const errors: Record<string, string> = {};
          
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            if (!field || path === field) {
              errors[path] = err.message;
            }
          });

          return { errors, isValid: false };
        }
        return { errors: { general: 'Validation failed' }, isValid: false };
      }
    },
    [schema]
  );

  // Validate specific field
  const validateField = useCallback(
    (field: keyof T, value: any) => {
      const newData = { ...state.data, [field]: value };
      const { errors } = validateData(newData, field);
      
      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field as string]: errors[field as string] || '',
        },
      }));
    },
    [state.data, validateData]
  );

  // Validate all fields
  const validateAll = useCallback(() => {
    setState(prev => ({ ...prev, isValidating: true }));
    
    const { errors, isValid } = validateData(state.data);
    
    setState(prev => ({
      ...prev,
      errors,
      isValid,
      isValidating: false,
    }));

    return isValid;
  }, [state.data, validateData]);

  // Set field value
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setState(prev => ({
        ...prev,
        data: { ...prev.data, [field]: value },
        touched: { ...prev.touched, [field as string]: true },
      }));

      if (validateOnChange) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
          validateField(field, value);
        }, debounceMs);

        setDebounceTimer(timer);
      }
    },
    [validateOnChange, validateField, debounceMs, debounceTimer]
  );

  // Set multiple values
  const setValues = useCallback((values: Partial<T>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...values },
      touched: {
        ...prev.touched,
        ...Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
      },
    }));

    if (validateOnChange) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        const { errors, isValid } = validateData({ ...state.data, ...values });
        setState(prev => ({
          ...prev,
          errors,
          isValid,
        }));
      }, debounceMs);

      setDebounceTimer(timer);
    }
  }, [validateOnChange, validateData, state.data, debounceMs, debounceTimer]);

  // Handle field blur
  const handleBlur = useCallback(
    (field: keyof T) => {
      setState(prev => ({
        ...prev,
        touched: { ...prev.touched, [field as string]: true },
      }));

      if (validateOnBlur) {
        validateField(field, state.data[field]);
      }
    },
    [validateOnBlur, validateField, state.data]
  );

  // Reset form
  const reset = useCallback((newData?: Partial<T>) => {
    setState({
      data: newData || initialData,
      errors: {},
      touched: {},
      isValid: false,
      isValidating: false,
    });
  }, [initialData]);

  // Get field props for easy integration with form inputs
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: state.data[field] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value);
      },
      onBlur: () => handleBlur(field),
      error: state.touched[field as string] ? state.errors[field as string] : undefined,
    }),
    [state.data, state.errors, state.touched, setValue, handleBlur]
  );

  // Get field error
  const getFieldError = useCallback(
    (field: keyof T) => {
      return state.touched[field as string] ? state.errors[field as string] : undefined;
    },
    [state.errors, state.touched]
  );

  // Check if field has error
  const hasFieldError = useCallback(
    (field: keyof T) => {
      return Boolean(state.touched[field as string] && state.errors[field as string]);
    },
    [state.errors, state.touched]
  );

  // Get all errors for touched fields
  const getTouchedErrors = useCallback(() => {
    const touchedErrors: Record<string, string> = {};
    Object.keys(state.touched).forEach(field => {
      if (state.touched[field] && state.errors[field]) {
        touchedErrors[field] = state.errors[field];
      }
    });
    return touchedErrors;
  }, [state.errors, state.touched]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // State
    data: state.data,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isValidating: state.isValidating,

    // Actions
    setValue,
    setValues,
    handleBlur,
    validateField,
    validateAll,
    reset,

    // Helpers
    getFieldProps,
    getFieldError,
    hasFieldError,
    getTouchedErrors,
  };
}