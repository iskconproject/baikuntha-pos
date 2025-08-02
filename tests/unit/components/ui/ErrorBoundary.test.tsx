import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, PageErrorBoundary, ComponentErrorBoundary, CriticalErrorBoundary } from '@/components/ui/ErrorBoundary';

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
    reload: vi.fn(),
  },
  writable: true,
});

// Mock alert
global.alert = vi.fn();

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error Details/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should retry when Try Again button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should reload page when Refresh Page button is clicked', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Refresh Page'));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should navigate to home when Go to Home button is clicked', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go to Home'));

    expect(window.location.href).toBe('/');
  });

  it('should copy error report when Report Error button is clicked', async () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Report Error'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"message":"Test error"')
    );
    expect(global.alert).toHaveBeenCalledWith(
      'Error report copied to clipboard. Please share this with support.'
    );
  });

  describe('error boundary levels', () => {
    it('should render component level error boundary', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.queryByText('Refresh Page')).not.toBeInTheDocument();
    });

    it('should render page level error boundary', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go to Home')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should render critical level error boundary', () => {
      render(
        <ErrorBoundary level="critical">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Critical Error')).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError, { level: 'component' });

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should pass props to wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('Specialized Error Boundaries', () => {
  it('should render PageErrorBoundary', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('should render ComponentErrorBoundary', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render CriticalErrorBoundary', () => {
    render(
      <CriticalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CriticalErrorBoundary>
    );

    expect(screen.getByText('Critical Error')).toBeInTheDocument();
    expect(screen.getByText('Reload Application')).toBeInTheDocument();
  });
});