import { render } from '@testing-library/react';
import { vi } from 'vitest';
import Home from '@/app/page';

// Mock Next.js router
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to login page on mount', () => {
    render(<Home />);
    
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('should render loading state', () => {
    const { getByText } = render(<Home />);
    
    expect(getByText('BaikunthaPOS')).toBeInTheDocument();
    expect(getByText('ISKCON Temple Point of Sale System')).toBeInTheDocument();
    expect(getByText('Loading...')).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    
    expect(main).toHaveClass('min-h-screen', 'bg-gradient-to-br', 'from-saffron-50', 'to-saffron-100');
  });
});