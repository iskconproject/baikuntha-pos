import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductList } from '../ProductList';
import { StockManager } from '../StockManager';
import { BulkOperations } from '../BulkOperations';
import { InventoryReports } from '../InventoryReports';
import { ProductDetailModal } from '../ProductDetailModal';

// Mock fetch globally
global.fetch = vi.fn();

// Mock data
const mockProducts = [
  {
    id: 'product-1',
    name: 'Bhagavad Gita',
    description: 'Sacred text of Hinduism',
    basePrice: 250,
    category: { id: 'cat-1', name: 'Books' },
    keywords: ['gita', 'scripture', 'hindu'],
    metadata: {
      author: 'Vyasa',
      publisher: 'ISKCON Press',
      language: 'English',
      material: 'Paper',
      customAttributes: { pages: '700' },
    },
    variants: [
      {
        id: 'variant-1',
        name: 'Hardcover',
        price: 300,
        stockQuantity: 10,
        attributes: { binding: 'hardcover' },
      },
      {
        id: 'variant-2',
        name: 'Paperback',
        price: 200,
        stockQuantity: 2,
        attributes: { binding: 'paperback' },
      },
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'product-2',
    name: 'Tulsi Mala',
    description: 'Sacred prayer beads',
    basePrice: 150,
    category: { id: 'cat-2', name: 'Accessories' },
    keywords: ['mala', 'beads', 'prayer'],
    metadata: {
      material: 'Tulsi wood',
      customAttributes: { beads: '108' },
    },
    variants: [
      {
        id: 'variant-3',
        name: 'Standard',
        price: 150,
        stockQuantity: 0,
        attributes: { size: 'standard' },
      },
    ],
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Books',
    description: 'Religious books and texts',
    keywords: ['book', 'text', 'scripture'],
    isActive: true,
    productCount: 1,
    children: [],
  },
  {
    id: 'cat-2',
    name: 'Accessories',
    description: 'Religious accessories',
    keywords: ['accessory', 'item'],
    isActive: true,
    productCount: 1,
    children: [],
  },
];

describe('ProductList Component', () => {
  const mockProps = {
    products: mockProducts,
    categories: mockCategories,
    onProductSelect: vi.fn(),
    onProductEdit: vi.fn(),
    onProductDelete: vi.fn(),
    onCreateProduct: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product list with correct data', () => {
    render(<ProductList {...mockProps} />);
    
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 products')).toBeInTheDocument();
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
  });

  it('filters products by search query', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search products...');
    await user.type(searchInput, 'gita');
    
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.queryByText('Tulsi Mala')).not.toBeInTheDocument();
  });

  it('filters products by category', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const categorySelect = screen.getByDisplayValue('All categories');
    await user.selectOptions(categorySelect, 'cat-1');
    
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.queryByText('Tulsi Mala')).not.toBeInTheDocument();
  });

  it('filters products by stock status', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const stockSelect = screen.getByDisplayValue('All products');
    await user.selectOptions(stockSelect, 'out-of-stock');
    
    expect(screen.queryByText('Bhagavad Gita')).not.toBeInTheDocument();
    expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
  });

  it('calls onProductEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);
    
    expect(mockProps.onProductEdit).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onProductDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);
    
    expect(mockProps.onProductDelete).toHaveBeenCalledWith('product-1');
  });

  it('calls onCreateProduct when add product button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const addButton = screen.getByText('Add Product');
    await user.click(addButton);
    
    expect(mockProps.onCreateProduct).toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    render(<ProductList {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('Products')).toBeInTheDocument();
    // Should show loading skeletons
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6);
  });

  it('displays empty state when no products', () => {
    render(<ProductList {...mockProps} products={[]} />);
    
    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or create a new product')).toBeInTheDocument();
  });

  it('sorts products correctly', async () => {
    const user = userEvent.setup();
    render(<ProductList {...mockProps} />);
    
    const sortSelect = screen.getByDisplayValue('Name');
    await user.selectOptions(sortSelect, 'price');
    
    // Products should be sorted by price
    const productCards = screen.getAllByRole('generic').filter(el => 
      el.textContent?.includes('₹')
    );
    
    // First product should be Tulsi Mala (₹150)
    expect(productCards[0]).toHaveTextContent('Tulsi Mala');
  });
});

describe('StockManager Component', () => {
  const mockProps = {
    products: mockProducts,
    onStockUpdate: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders stock statistics correctly', () => {
    render(<StockManager {...mockProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total items
    expect(screen.getByText('1')).toBeInTheDocument(); // Out of stock
    expect(screen.getByText('1')).toBeInTheDocument(); // Low stock
    expect(screen.getByText('1')).toBeInTheDocument(); // In stock
  });

  it('filters stock items by status', async () => {
    const user = userEvent.setup();
    render(<StockManager {...mockProps} />);
    
    const statusSelect = screen.getByDisplayValue('All Items');
    await user.selectOptions(statusSelect, 'out');
    
    // Should only show out of stock items
    expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
    expect(screen.queryByText('Bhagavad Gita')).not.toBeInTheDocument();
  });

  it('updates low stock threshold', async () => {
    const user = userEvent.setup();
    render(<StockManager {...mockProps} />);
    
    const thresholdInput = screen.getByDisplayValue('5');
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '10');
    
    // Should update the low stock count
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Low stock count should increase
    });
  });

  it('selects and deselects items', async () => {
    const user = userEvent.setup();
    render(<StockManager {...mockProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const firstItemCheckbox = checkboxes[1]; // Skip "Select All" checkbox
    
    await user.click(firstItemCheckbox);
    
    expect(screen.getByText('Update Selected (1)')).toBeInTheDocument();
    
    await user.click(firstItemCheckbox);
    
    expect(screen.getByText('Update Selected (0)')).toBeInTheDocument();
  });

  it('opens bulk update modal', async () => {
    const user = userEvent.setup();
    render(<StockManager {...mockProps} />);
    
    // Select an item first
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    
    const updateButton = screen.getByText('Update Selected (1)');
    await user.click(updateButton);
    
    expect(screen.getByText('Update Stock Levels')).toBeInTheDocument();
  });

  it('processes stock updates correctly', async () => {
    const user = userEvent.setup();
    render(<StockManager {...mockProps} />);
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    
    // Open update modal
    const updateButton = screen.getByText('Update Selected (1)');
    await user.click(updateButton);
    
    // Change stock quantity
    const quantityInput = screen.getByDisplayValue('10');
    await user.clear(quantityInput);
    await user.type(quantityInput, '15');
    
    // Submit update
    const submitButton = screen.getByText('Update Stock');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"quantity":15'),
      });
    });
  });
});

describe('BulkOperations Component', () => {
  const mockProps = {
    products: mockProducts,
    categories: mockCategories,
    onOperationComplete: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders bulk operation cards', () => {
    render(<BulkOperations {...mockProps} />);
    
    expect(screen.getByText('Import Products')).toBeInTheDocument();
    expect(screen.getByText('Export Products')).toBeInTheDocument();
    expect(screen.getByText('Bulk Edit')).toBeInTheDocument();
  });

  it('selects products for bulk operations', async () => {
    const user = userEvent.setup();
    render(<BulkOperations {...mockProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const firstProductCheckbox = checkboxes[1]; // Skip "Select All"
    
    await user.click(firstProductCheckbox);
    
    expect(screen.getByText('Edit Selected (1)')).toBeInTheDocument();
    expect(screen.getByText('Export (1)')).toBeInTheDocument();
  });

  it('opens bulk edit modal', async () => {
    const user = userEvent.setup();
    render(<BulkOperations {...mockProps} />);
    
    // Select a product
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    
    // Open bulk edit
    const editButton = screen.getByText('Edit Selected (1)');
    await user.click(editButton);
    
    expect(screen.getByText('Bulk Edit Products')).toBeInTheDocument();
  });

  it('processes bulk price updates', async () => {
    const user = userEvent.setup();
    render(<BulkOperations {...mockProps} />);
    
    // Select a product
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    
    // Open bulk edit modal
    const editButton = screen.getByText('Edit Selected (1)');
    await user.click(editButton);
    
    // Set price adjustment
    const operationSelect = screen.getByDisplayValue('No change');
    await user.selectOptions(operationSelect, 'increase');
    
    const valueInput = screen.getByPlaceholderText('Value');
    await user.type(valueInput, '10');
    
    // Apply changes
    const applyButton = screen.getByText('Apply Changes');
    await user.click(applyButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products/product-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"basePrice":260'), // 250 + 10
      });
    });
  });

  it('handles export operations', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    render(<BulkOperations {...mockProps} />);
    
    const exportButton = screen.getByText('Export (2)');
    await user.click(exportButton);
    
    // Confirm export
    const confirmButton = screen.getByText('Export');
    await user.click(confirmButton);
    
    expect(mockLink.click).toHaveBeenCalled();
  });
});

describe('InventoryReports Component', () => {
  const mockProps = {
    products: mockProducts,
    categories: mockCategories,
    isLoading: false,
  };

  it('renders overview report correctly', () => {
    render(<InventoryReports {...mockProps} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total products
    expect(screen.getByText('3')).toBeInTheDocument(); // Total variants
  });

  it('switches between report tabs', async () => {
    const user = userEvent.setup();
    render(<InventoryReports {...mockProps} />);
    
    const categoryTab = screen.getByText('By Category');
    await user.click(categoryTab);
    
    // Check for category names in the table
    expect(screen.getByRole('cell', { name: 'Books' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Accessories' })).toBeInTheDocument();
  });

  it('displays stock report with correct data', async () => {
    const user = userEvent.setup();
    render(<InventoryReports {...mockProps} />);
    
    const stockTab = screen.getByText('Stock Levels');
    await user.click(stockTab);
    
    expect(screen.getByText('Showing 3 stock items')).toBeInTheDocument();
    expect(screen.getByText('Hardcover')).toBeInTheDocument();
    expect(screen.getByText('Paperback')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('filters category report', async () => {
    const user = userEvent.setup();
    render(<InventoryReports {...mockProps} />);
    
    const categoryTab = screen.getByText('By Category');
    await user.click(categoryTab);
    
    const categoryFilter = screen.getByDisplayValue('All Categories');
    await user.selectOptions(categoryFilter, 'cat-1');
    
    // Should still show the category table with Books category
    expect(screen.getByRole('cell', { name: 'Books' })).toBeInTheDocument();
  });

  it('exports reports', async () => {
    const user = userEvent.setup();
    
    // Mock download functionality
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    const { container } = render(<InventoryReports {...mockProps} />);
    
    const exportButton = screen.getByText('Export Report');
    await user.click(exportButton);
    
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toBe('inventory-overview.json');
  });
});

describe('ProductDetailModal Component', () => {
  const mockProps = {
    product: mockProducts[0],
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders product details correctly', () => {
    render(<ProductDetailModal {...mockProps} />);
    
    expect(screen.getAllByText('Bhagavad Gita')).toHaveLength(2); // Title and product name field
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // Total stock
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<ProductDetailModal {...mockProps} />);
    
    const variantsTab = screen.getByText('Variants & Stock');
    await user.click(variantsTab);
    
    expect(screen.getByText('Product Variants (2)')).toBeInTheDocument();
    expect(screen.getByText('Hardcover')).toBeInTheDocument();
    expect(screen.getByText('Paperback')).toBeInTheDocument();
  });

  it('updates stock quantities', async () => {
    const user = userEvent.setup();
    render(<ProductDetailModal {...mockProps} />);
    
    // Go to variants tab
    const variantsTab = screen.getByText('Variants & Stock');
    await user.click(variantsTab);
    
    // Update stock for first variant
    const stockInputs = screen.getAllByDisplayValue('10');
    await user.clear(stockInputs[0]);
    await user.type(stockInputs[0], '15');
    
    // Save changes
    const saveButton = screen.getByText('Save Stock Updates');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"quantity":15'),
      });
    });
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductDetailModal {...mockProps} />);
    
    const editButton = screen.getByText('Edit Product');
    await user.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<ProductDetailModal {...mockProps} />);
    
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);
    
    expect(mockProps.onDelete).toHaveBeenCalledWith('product-1');
  });

  it('displays product metadata', () => {
    render(<ProductDetailModal {...mockProps} />);
    
    expect(screen.getByText('Vyasa')).toBeInTheDocument(); // Author
    expect(screen.getByText('ISKCON Press')).toBeInTheDocument(); // Publisher
    expect(screen.getByText('English')).toBeInTheDocument(); // Language
    expect(screen.getByText('Paper')).toBeInTheDocument(); // Material
  });

  it('displays search keywords', () => {
    render(<ProductDetailModal {...mockProps} />);
    
    expect(screen.getByText('gita')).toBeInTheDocument();
    expect(screen.getByText('scripture')).toBeInTheDocument();
    expect(screen.getByText('hindu')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { products: mockProducts } }),
    });
  });

  it('handles complete product management workflow', async () => {
    const user = userEvent.setup();
    
    const mockInventoryProps = {
      products: mockProducts,
      categories: mockCategories,
      onProductSelect: vi.fn(),
      onProductEdit: vi.fn(),
      onProductDelete: vi.fn(),
      onCreateProduct: vi.fn(),
      isLoading: false,
    };
    
    render(<ProductList {...mockInventoryProps} />);
    
    // Search for a product
    const searchInput = screen.getByPlaceholderText('Search products...');
    await user.type(searchInput, 'gita');
    
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    
    // Edit the product
    const editButton = screen.getByText('Edit');
    await user.click(editButton);
    
    expect(mockInventoryProps.onProductEdit).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('handles stock management workflow', async () => {
    const user = userEvent.setup();
    
    const mockStockProps = {
      products: mockProducts,
      onStockUpdate: vi.fn(),
      isLoading: false,
    };
    
    render(<StockManager {...mockStockProps} />);
    
    // Filter by low stock
    const statusSelect = screen.getByDisplayValue('All Items');
    await user.selectOptions(statusSelect, 'low');
    
    // Select low stock item
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    
    // Update stock
    const updateButton = screen.getByText('Update Selected (1)');
    await user.click(updateButton);
    
    expect(screen.getByText('Update Stock Levels')).toBeInTheDocument();
  });
});

// Cleanup
afterEach(() => {
  vi.restoreAllMocks();
});