/**
 * Currency symbol mapping
 */
export const getCurrencySymbol = (currencyCode: string | null | undefined): string => {
  if (!currencyCode) return '$';
  
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    MXN: 'MX$',
    BRL: 'R$',
    SEK: 'kr',
  };
  
  return symbols[currencyCode] || currencyCode;
};

/**
 * Format budget with currency symbol
 */
export const formatBudget = (budget: number | string | null | undefined, currencyCode: string | null | undefined): string => {
  if (!budget) return '';
  // Convert string to number if needed
  const budgetNum = typeof budget === 'string' ? parseFloat(budget) : budget;
  if (isNaN(budgetNum)) return '';
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${budgetNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

