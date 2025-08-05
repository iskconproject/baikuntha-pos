'use client';

interface SmartPaymentSuggestionsProps {
  total: number;
  onSuggestionClick: (amount: number) => void;
  className?: string;
}

export function SmartPaymentSuggestions({ 
  total, 
  onSuggestionClick, 
  className = '' 
}: SmartPaymentSuggestionsProps) {
  // Generate smart cash amount suggestions
  const generateSuggestions = (amount: number): number[] => {
    const suggestions: number[] = [];
    
    // Round up to nearest 10, 50, 100, 500
    const roundUps = [10, 50, 100, 500];
    
    for (const roundUp of roundUps) {
      const rounded = Math.ceil(amount / roundUp) * roundUp;
      if (rounded > amount && rounded <= amount * 2) {
        suggestions.push(rounded);
      }
    }
    
    // Add exact amount
    suggestions.unshift(amount);
    
    // Remove duplicates and sort
    return Array.from(new Set(suggestions)).sort((a, b) => a - b).slice(0, 4);
  };

  const suggestions = generateSuggestions(total);

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Quick Cash Amounts
      </label>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onSuggestionClick(amount)}
            className={`px-4 py-3 text-sm font-medium rounded-lg border transition-colors ${
              amount === total
                ? 'bg-orange-100 border-orange-300 text-orange-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">₹{amount.toFixed(2)}</div>
              {amount > total && (
                <div className="text-xs text-gray-500">
                  Change: ₹{(amount - total).toFixed(2)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}