import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SalesPage from '@/app/(dashboard)/sales/page';

// Mock the sales components
vi.mock('@/components/sales/ProductSelection', () => ({
  ProductSelection: () => <div data-testid="product-selection">Product Selection</div>
}));

vi.mock('@/components/sales/CartManager', () => ({
  CartManager: ({ onCheckout }: { onCheckout: () => void }) => (
    <div data-testid="cart-manager">
      <button onClick={onCheckout} data-testid="checkout-button">Checkout</button>
    </div>
  )
}));

vi.mock('@/components/sales/PaymentProcessor', () => ({
  PaymentProcessor: ({ onPaymentComplete, onCancel }: { 
    onPaymentComplete: (transaction: any) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="payment-processor">
      <button onClick={() => onPaymentComplete({ id: 'test-transaction', total: 100 })} data-testid="complete-payment">
        Complete Payment
      </button>
      <button onClick={onCancel} data-testid="cancel-payment">Cancel</button>
    </div>
  )
}));

vi.mock('@/components/sales/TransactionHistory', () => ({
  TransactionHistory: ({ limit }: { limit: number }) => (
    <div data-testid="transaction-history">Transaction History (limit: {limit})</div>
  )
}));

vi.mock('@/types', () => ({
  Transaction: {}
}));

describe('SalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the sales page with initial selection step', () => {
    render(<SalesPage />);
    
    expect(screen.getByText('Point of Sale')).toBeInTheDocument();
    expect(screen.getByTestId('product-selection')).toBeInTheDocument();
    expect(screen.getByTestId('cart-manager')).toBeInTheDocument();
  });

  it('should show transaction history when history button is clicked', () => {
    render(<SalesPage />);
    
    // Find and click the transaction history button
    const historyButton = screen.getByTitle('Transaction History');
    fireEvent.click(historyButton);
    
    // Check if transaction history is displayed
    expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  it('should hide transaction history when close button is clicked', () => {
    render(<SalesPage />);
    
    // Open transaction history
    const historyButton = screen.getByTitle('Transaction History');
    fireEvent.click(historyButton);
    
    // Close transaction history
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Check if transaction history is hidden
    expect(screen.queryByTestId('transaction-history')).not.toBeInTheDocument();
  });

  it('should navigate to payment step when checkout is clicked', () => {
    render(<SalesPage />);
    
    // Click checkout button
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    // Check if payment processor is displayed
    expect(screen.getByTestId('payment-processor')).toBeInTheDocument();
    expect(screen.queryByTestId('product-selection')).not.toBeInTheDocument();
  });

  it('should navigate to receipt step when payment is completed', () => {
    render(<SalesPage />);
    
    // Navigate to payment step
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    // Complete payment
    const completePaymentButton = screen.getByTestId('complete-payment');
    fireEvent.click(completePaymentButton);
    
    // Check if receipt is displayed
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(screen.getByText('Transaction completed successfully')).toBeInTheDocument();
  });

  it('should return to selection step when payment is cancelled', () => {
    render(<SalesPage />);
    
    // Navigate to payment step
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    // Cancel payment
    const cancelButton = screen.getByTestId('cancel-payment');
    fireEvent.click(cancelButton);
    
    // Check if back to selection step
    expect(screen.getByTestId('product-selection')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-processor')).not.toBeInTheDocument();
  });

  it('should return to selection step when new transaction is started', () => {
    render(<SalesPage />);
    
    // Navigate through all steps to receipt
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    const completePaymentButton = screen.getByTestId('complete-payment');
    fireEvent.click(completePaymentButton);
    
    // Start new transaction
    const newTransactionButton = screen.getByText('New Transaction');
    fireEvent.click(newTransactionButton);
    
    // Check if back to selection step
    expect(screen.getByTestId('product-selection')).toBeInTheDocument();
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
  });

  it('should display correct step indicators', () => {
    render(<SalesPage />);
    
    // Check initial step indicators
    const stepIndicators = screen.getAllByText('1');
    expect(stepIndicators.length).toBeGreaterThan(0);
    
    // Navigate to payment step
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    // Check payment step indicators
    const paymentStepIndicators = screen.getAllByText('2');
    expect(paymentStepIndicators.length).toBeGreaterThan(0);
  });

  it('should format currency correctly', () => {
    render(<SalesPage />);
    
    // Navigate through to receipt step
    const checkoutButton = screen.getByTestId('checkout-button');
    fireEvent.click(checkoutButton);
    
    const completePaymentButton = screen.getByTestId('complete-payment');
    fireEvent.click(completePaymentButton);
    
    // Check if currency is formatted correctly (₹100.00)
    expect(screen.getByText('₹100.00')).toBeInTheDocument();
  });
});