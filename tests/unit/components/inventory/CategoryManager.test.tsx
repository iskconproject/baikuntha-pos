import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryManager } from '@/components/inventory/CategoryManager';
import type { Category } from '@/types';

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));

vi.mock('@/components/ui/Select', () => ({
  Select: ({ options, ...props }: any) => (
    <select {...props}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, onClose }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (fn: any) => fn,
    watch: () => [],
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: { errors: {}, isSubmitting: false },
  }),
  useFieldArray: () => ({
    fields: [],
    append: vi.fn(),
    remove: vi.fn(),
  }),
}));

// Mock validation
vi.mock('@/lib/validation/category', () => ({
  categoryFormSchema: {},
}));

// Mock zodResolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => ({}),
}));

interface CategoryWithExtras extends Category {
  productCount?: number;
  children?: CategoryWithExtras[];
}

const mockCategories: CategoryWithExtras[] = [
  {
    id: '1',
    name: 'Books',
    description: 'Spiritual books',
    parentId: null,
    keywords: ['books', 'literature'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    productCount: 5,
    children: [
      {
        id: '2',
        name: 'Bhagavad Gita',
        description: 'Bhagavad Gita books',
        parentId: '1',
        keywords: ['gita', 'krishna'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        productCount: 2,
        children: [],
      },
    ],
  },
];

describe('CategoryManager', () => {
  const mockProps = {
    categories: mockCategories,
    onCreateCategory: vi.fn(),
    onUpdateCategory: vi.fn(),
    onDeleteCategory: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categories correctly', () => {
    render(<CategoryManager {...mockProps} />);
    
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('5 products')).toBeInTheDocument();
  });

  it('opens modal when Add Category button is clicked', () => {
    render(<CategoryManager {...mockProps} />);
    
    const addButton = screen.getByText('Add Category');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Create Category')).toBeInTheDocument();
  });

  it('expands and collapses category tree', () => {
    render(<CategoryManager {...mockProps} />);
    
    // Should show expand button for categories with children
    const expandButton = screen.getByText('▶');
    expect(expandButton).toBeInTheDocument();
    
    fireEvent.click(expandButton);
    
    // After clicking, should show collapse button
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('shows edit modal when edit button is clicked', () => {
    render(<CategoryManager {...mockProps} />);
    
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Category')).toBeInTheDocument();
  });

  it('calls onDeleteCategory when delete is confirmed', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<CategoryManager {...mockProps} />);
    
    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(mockProps.onDeleteCategory).toHaveBeenCalledWith('1');
    });
    
    confirmSpy.mockRestore();
  });

  it('shows loading state', () => {
    render(<CategoryManager {...mockProps} isLoading={true} />);
    
    // Should show loading skeleton
    expect(screen.getByText('Categories')).toBeInTheDocument();
    // Loading skeleton should be present (animated elements)
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no categories', () => {
    render(<CategoryManager {...mockProps} categories={[]} />);
    
    expect(screen.getByText('No categories found')).toBeInTheDocument();
    expect(screen.getByText('Create your first category to get started')).toBeInTheDocument();
  });
});