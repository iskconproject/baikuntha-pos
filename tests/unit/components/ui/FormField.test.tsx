import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField, ValidationMessage, FormErrorSummary } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

describe('FormField', () => {
  it('should render label when provided', () => {
    render(
      <FormField label="Test Label">
        <Input />
      </FormField>
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render required indicator when required', () => {
    render(
      <FormField label="Required Field" required>
        <Input />
      </FormField>
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should render error message', () => {
    render(
      <FormField label="Test Field" error="This field is required">
        <Input />
      </FormField>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render success message', () => {
    render(
      <FormField label="Test Field" success="Field is valid">
        <Input />
      </FormField>
    );

    expect(screen.getByText('Field is valid')).toBeInTheDocument();
  });

  it('should render hint text', () => {
    render(
      <FormField label="Test Field" hint="This is a helpful hint">
        <Input />
      </FormField>
    );

    expect(screen.getByText('This is a helpful hint')).toBeInTheDocument();
  });

  it('should prioritize error over success and hint', () => {
    render(
      <FormField 
        label="Test Field" 
        error="Error message"
        success="Success message"
        hint="Hint message"
      >
        <Input />
      </FormField>
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.queryByText('Hint message')).not.toBeInTheDocument();
  });

  it('should apply error styling to input', () => {
    render(
      <FormField error="Error message">
        <Input data-testid="test-input" />
      </FormField>
    );

    const input = screen.getByTestId('test-input');
    expect(input).toHaveClass('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
  });

  it('should apply success styling to input', () => {
    render(
      <FormField success="Success message">
        <Input data-testid="test-input" />
      </FormField>
    );

    const input = screen.getByTestId('test-input');
    expect(input).toHaveClass('border-green-300', 'focus:border-green-500', 'focus:ring-green-500');
  });

  it('should set aria attributes correctly', () => {
    render(
      <FormField label="Test Field" error="Error message" id="test-field">
        <Input />
      </FormField>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'test-field-error');
  });
});

describe('ValidationMessage', () => {
  it('should render error message with correct styling', () => {
    render(<ValidationMessage type="error" message="Error occurred" />);

    const message = screen.getByText('Error occurred');
    expect(message.closest('div')).toHaveClass('text-red-600', 'bg-red-50', 'border-red-200');
  });

  it('should render success message with correct styling', () => {
    render(<ValidationMessage type="success" message="Success!" />);

    const message = screen.getByText('Success!');
    expect(message.closest('div')).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200');
  });

  it('should render warning message with correct styling', () => {
    render(<ValidationMessage type="warning" message="Warning!" />);

    const message = screen.getByText('Warning!');
    expect(message.closest('div')).toHaveClass('text-yellow-600', 'bg-yellow-50', 'border-yellow-200');
  });

  it('should render info message with correct styling', () => {
    render(<ValidationMessage type="info" message="Information" />);

    const message = screen.getByText('Information');
    expect(message.closest('div')).toHaveClass('text-blue-600', 'bg-blue-50', 'border-blue-200');
  });
});

describe('FormErrorSummary', () => {
  it('should render error summary with multiple errors', () => {
    const errors = {
      name: 'Name is required',
      email: 'Invalid email format',
      age: 'Must be at least 18',
    };

    render(<FormErrorSummary errors={errors} />);

    expect(screen.getByText('Please correct the following errors:')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 18')).toBeInTheDocument();
  });

  it('should not render when no errors', () => {
    const { container } = render(<FormErrorSummary errors={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when errors are empty strings', () => {
    const errors = {
      name: '',
      email: '',
    };

    const { container } = render(<FormErrorSummary errors={errors} />);
    expect(container.firstChild).toBeNull();
  });

  it('should only render non-empty error messages', () => {
    const errors = {
      name: 'Name is required',
      email: '', // Empty error
      age: 'Must be at least 18',
    };

    render(<FormErrorSummary errors={errors} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 18')).toBeInTheDocument();
    expect(screen.queryByText('email')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const errors = { name: 'Error' };

    render(<FormErrorSummary errors={errors} className="custom-class" />);

    const summary = screen.getByText('Please correct the following errors:').closest('div');
    expect(summary).toHaveClass('custom-class');
  });
});