import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from '@/hooks/useFormValidation';

// Mock schema for testing
const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

type TestFormData = z.infer<typeof testSchema>;

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    expect(result.current.data).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });

  it('should initialize with initial data', () => {
    const initialData = { name: 'John', email: 'john@example.com' };
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        initialData,
      })
    );

    expect(result.current.data).toEqual(initialData);
  });

  it('should set field value and mark as touched', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnChange: false,
      })
    );

    act(() => {
      result.current.setValue('name', 'John');
    });

    expect(result.current.data.name).toBe('John');
    expect(result.current.touched.name).toBe(true);
  });

  it('should validate field on change when enabled', async () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnChange: true,
        debounceMs: 100,
      })
    );

    act(() => {
      result.current.setValue('name', 'J');
    });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.errors.name).toBe('Name must be at least 2 characters');
  });

  it('should validate field on blur when enabled', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnBlur: true,
      })
    );

    act(() => {
      result.current.setValue('email', 'invalid-email');
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBe('Invalid email format');
    expect(result.current.touched.email).toBe(true);
  });

  it('should validate all fields', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValues({
        name: 'J',
        email: 'invalid-email',
        age: 16,
      });
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.name).toBe('Name must be at least 2 characters');
    expect(result.current.errors.email).toBe('Invalid email format');
    expect(result.current.errors.age).toBe('Must be at least 18 years old');
    expect(result.current.isValid).toBe(false);
  });

  it('should return true when all fields are valid', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValues({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      });
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(true);
  });

  it('should set multiple values at once', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnChange: false,
      })
    );

    const values = { name: 'John', email: 'john@example.com' };

    act(() => {
      result.current.setValues(values);
    });

    expect(result.current.data).toMatchObject(values);
    expect(result.current.touched.name).toBe(true);
    expect(result.current.touched.email).toBe(true);
  });

  it('should reset form to initial state', () => {
    const initialData = { name: 'Initial' };
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        initialData,
      })
    );

    act(() => {
      result.current.setValue('name', 'Changed');
      result.current.handleBlur('name');
    });

    expect(result.current.data.name).toBe('Changed');
    expect(result.current.touched.name).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual(initialData);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(false);
  });

  it('should reset form with new data', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    const newData = { name: 'New Name', email: 'new@example.com' };

    act(() => {
      result.current.reset(newData);
    });

    expect(result.current.data).toEqual(newData);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('should get field props for form integration', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValue('name', 'John');
      result.current.handleBlur('name');
    });

    const fieldProps = result.current.getFieldProps('name');

    expect(fieldProps.value).toBe('John');
    expect(fieldProps.onChange).toBeInstanceOf(Function);
    expect(fieldProps.onBlur).toBeInstanceOf(Function);
    expect(fieldProps.error).toBeUndefined(); // No error for valid name
  });

  it('should get field error', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValue('name', 'J');
      result.current.handleBlur('name');
      result.current.validateField('name', 'J');
    });

    const error = result.current.getFieldError('name');
    expect(error).toBe('Name must be at least 2 characters');
  });

  it('should check if field has error', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValue('name', 'J');
      result.current.handleBlur('name');
      result.current.validateField('name', 'J');
    });

    expect(result.current.hasFieldError('name')).toBe(true);
    expect(result.current.hasFieldError('email')).toBe(false);
  });

  it('should get touched errors only', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
      })
    );

    act(() => {
      result.current.setValue('name', 'J');
      result.current.setValue('email', 'invalid');
      result.current.handleBlur('name'); // Only touch name
      result.current.validateField('name', 'J');
      result.current.validateField('email', 'invalid');
    });

    const touchedErrors = result.current.getTouchedErrors();
    expect(touchedErrors).toHaveProperty('name');
    expect(touchedErrors).not.toHaveProperty('email'); // Not touched
  });

  it('should debounce validation on change', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnChange: true,
        debounceMs: 300,
      })
    );

    act(() => {
      result.current.setValue('name', 'J');
    });

    // Should not validate immediately
    expect(result.current.errors.name).toBeUndefined();

    // Fast-forward less than debounce time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.errors.name).toBeUndefined();

    // Fast-forward past debounce time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.errors.name).toBe('Name must be at least 2 characters');
  });

  it('should handle field props onChange event', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        validateOnChange: false,
      })
    );

    const fieldProps = result.current.getFieldProps('name');
    const mockEvent = {
      target: { value: 'John Doe' },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      fieldProps.onChange(mockEvent);
    });

    expect(result.current.data.name).toBe('John Doe');
    expect(result.current.touched.name).toBe(true);
  });
});