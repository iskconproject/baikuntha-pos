import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolver, useConflictResolver, type ConflictData } from '@/components/common/ConflictResolver';

describe('ConflictResolver', () => {
  const mockConflicts: ConflictData[] = [
    {
      id: 'conflict1',
      tableName: 'products',
      localRecord: {
        id: 'prod1',
        name: 'Local Product Name',
        price: 100,
        description: 'Local description',
        updatedAt: new Date('2024-01-01T12:00:00Z')
      },
      cloudRecord: {
        id: 'prod1',
        name: 'Cloud Product Name',
        price: 120,
        description: 'Cloud description',
        updatedAt: new Date('2024-01-01T13:00:00Z')
      },
      conflictFields: ['name', 'price', 'description'],
      timestamp: new Date('2024-01-01T14:00:00Z')
    },
    {
      id: 'conflict2',
      tableName: 'users',
      localRecord: {
        id: 'user1',
        username: 'local_user',
        role: 'manager',
        updatedAt: new Date('2024-01-01T11:00:00Z')
      },
      cloudRecord: {
        id: 'user1',
        username: 'cloud_user',
        role: 'admin',
        updatedAt: new Date('2024-01-01T12:30:00Z')
      },
      conflictFields: ['username', 'role'],
      timestamp: new Date('2024-01-01T14:30:00Z')
    }
  ];

  const mockOnResolve = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conflict resolver modal when open', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Resolve Data Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Conflict 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Products - ID: prod1')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Resolve Data Conflicts')).not.toBeInTheDocument();
  });

  it('does not render when no conflicts', () => {
    render(
      <ConflictResolver
        conflicts={[]}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.queryByText('Resolve Data Conflicts')).not.toBeInTheDocument();
  });

  it('displays conflict details correctly', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Conflict Details')).toBeInTheDocument();
    expect(screen.getByText(/this record has been modified both locally and on the server/i)).toBeInTheDocument();
    expect(screen.getByText('Conflicting fields: name, price, description')).toBeInTheDocument();
  });

  it('shows field comparison for conflicting fields', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Check field names are displayed
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();

    // Check local and cloud values are displayed
    expect(screen.getByText('Local Product Name')).toBeInTheDocument();
    expect(screen.getByText('Cloud Product Name')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('allows selecting local value for a field', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const useLocalButtons = screen.getAllByText('Use Local');
    fireEvent.click(useLocalButtons[0]); // Click on first field's "Use Local" button

    // The selected value should be highlighted
    const selectedValue = screen.getByText('Local Product Name').closest('.text-purple-700');
    expect(selectedValue).toBeInTheDocument();
  });

  it('allows selecting cloud value for a field', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const useCloudButtons = screen.getAllByText('Use Cloud');
    fireEvent.click(useCloudButtons[0]); // Click on first field's "Use Cloud" button

    // The selected value should be highlighted
    const selectedValue = screen.getByText('Cloud Product Name').closest('.text-purple-700');
    expect(selectedValue).toBeInTheDocument();
  });

  it('resolves conflict with local values', async () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const useAllLocalButton = screen.getByText('Use All Local');
    fireEvent.click(useAllLocalButton);

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith('conflict1', 'local');
    });
  });

  it('resolves conflict with cloud values', async () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const useAllCloudButton = screen.getByText('Use All Cloud');
    fireEvent.click(useAllCloudButton);

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith('conflict1', 'cloud');
    });
  });

  it('resolves conflict with merged values', async () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Select some local and some cloud values
    const useLocalButtons = screen.getAllByText('Use Local');
    const useCloudButtons = screen.getAllByText('Use Cloud');
    
    fireEvent.click(useLocalButtons[0]); // Use local name
    fireEvent.click(useCloudButtons[1]); // Use cloud price

    const useMergedButton = screen.getByText('Use Merged');
    fireEvent.click(useMergedButton);

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith('conflict1', 'merge', expect.any(Object));
    });
  });

  it('navigates to next conflict after resolution', async () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Initially showing first conflict
    expect(screen.getByText('Conflict 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Products - ID: prod1')).toBeInTheDocument();

    const useAllLocalButton = screen.getByText('Use All Local');
    fireEvent.click(useAllLocalButton);

    await waitFor(() => {
      expect(screen.getByText('Conflict 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('Users - ID: user1')).toBeInTheDocument();
    });
  });

  it('closes modal after resolving last conflict', async () => {
    const singleConflict = [mockConflicts[0]];
    
    render(
      <ConflictResolver
        conflicts={singleConflict}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const useAllLocalButton = screen.getByText('Use All Local');
    fireEvent.click(useAllLocalButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  it('shows and hides JSON editor', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Initially hidden
    expect(screen.queryByText('Manual Merge Editor')).not.toBeInTheDocument();

    const showEditorButton = screen.getByText('Show JSON Editor');
    fireEvent.click(showEditorButton);

    expect(screen.getByText('Manual Merge Editor')).toBeInTheDocument();
    expect(screen.getByText('Hide JSON Editor')).toBeInTheDocument();

    const hideEditorButton = screen.getByText('Hide JSON Editor');
    fireEvent.click(hideEditorButton);

    expect(screen.queryByText('Manual Merge Editor')).not.toBeInTheDocument();
  });

  it('allows manual JSON editing', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const showEditorButton = screen.getByText('Show JSON Editor');
    fireEvent.click(showEditorButton);

    const textarea = screen.getByPlaceholderText('Edit the merged data as JSON...');
    expect(textarea).toBeInTheDocument();

    const newData = JSON.stringify({ id: 'prod1', name: 'Manually Edited Name' }, null, 2);
    fireEvent.change(textarea, { target: { value: newData } });

    expect(textarea).toHaveValue(newData);
  });

  it('skips remaining conflicts when requested', () => {
    render(
      <ConflictResolver
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const skipButton = screen.getByText('Skip Remaining Conflicts');
    fireEvent.click(skipButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('formats table names correctly', () => {
    const conflictWithUnderscores: ConflictData = {
      ...mockConflicts[0],
      tableName: 'product_variants'
    };

    render(
      <ConflictResolver
        conflicts={[conflictWithUnderscores]}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Product Variants - ID: prod1')).toBeInTheDocument();
  });

  it('formats field names correctly', () => {
    const conflictWithCamelCase: ConflictData = {
      ...mockConflicts[0],
      conflictFields: ['productName', 'basePrice']
    };

    render(
      <ConflictResolver
        conflicts={[conflictWithCamelCase]}
        onResolve={mockOnResolve}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Product Name')).toBeInTheDocument();
    expect(screen.getByText('Base Price')).toBeInTheDocument();
  });
});

describe('useConflictResolver', () => {
  it('initializes with empty conflicts', () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useConflictResolver();
      return null;
    }

    render(<TestComponent />);

    expect(hookResult.conflicts).toEqual([]);
    expect(hookResult.hasConflicts).toBe(false);
    expect(hookResult.isResolving).toBe(false);
  });

  it('adds conflicts correctly', () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useConflictResolver();
      return null;
    }

    render(<TestComponent />);

    const conflict = mockConflicts[0];
    hookResult.addConflict(conflict);

    expect(hookResult.conflicts).toContain(conflict);
    expect(hookResult.hasConflicts).toBe(true);
  });

  it('resolves conflicts correctly', async () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useConflictResolver();
      return null;
    }

    render(<TestComponent />);

    const conflict = mockConflicts[0];
    hookResult.addConflict(conflict);

    expect(hookResult.conflicts).toHaveLength(1);

    await hookResult.resolveConflict('conflict1', 'local');

    expect(hookResult.conflicts).toHaveLength(0);
    expect(hookResult.hasConflicts).toBe(false);
  });

  it('clears all conflicts', () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useConflictResolver();
      return null;
    }

    render(<TestComponent />);

    mockConflicts.forEach(conflict => {
      hookResult.addConflict(conflict);
    });

    expect(hookResult.conflicts).toHaveLength(2);

    hookResult.clearAllConflicts();

    expect(hookResult.conflicts).toHaveLength(0);
    expect(hookResult.hasConflicts).toBe(false);
  });
});