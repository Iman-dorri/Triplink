"""
Strict money parsing and validation utilities.
Converts money strings to integer cents without floating-point operations.
"""
from decimal import Decimal, InvalidOperation
from typing import Tuple


def parse_money_to_cents(money_str: str) -> Tuple[int, str]:
    """
    Parse a money string to integer cents.
    
    Rules:
    - Accept strings with max 2 decimals (e.g., "12", "12.3", "12.30")
    - Reject >2 decimals, negative/zero, and non-numeric
    - Convert to integer cents without floats
    
    Args:
        money_str: String representation of money amount
        
    Returns:
        Tuple of (cents: int, error_message: str)
        If successful, error_message is empty string
        If failed, cents is 0 and error_message contains reason
    """
    if not isinstance(money_str, str):
        return (0, "Amount must be a string")
    
    # Strip whitespace
    money_str = money_str.strip()
    
    if not money_str:
        return (0, "Amount cannot be empty")
    
    # Check for negative sign
    if money_str.startswith('-'):
        return (0, "Amount cannot be negative")
    
    # Check for non-numeric characters (allow digits, single decimal point)
    if not all(c.isdigit() or c == '.' for c in money_str):
        return (0, "Amount must be numeric")
    
    # Count decimal points
    decimal_count = money_str.count('.')
    if decimal_count > 1:
        return (0, "Amount cannot have multiple decimal points")
    
    # Parse using Decimal for precision (no float conversion)
    try:
        decimal_value = Decimal(money_str)
    except InvalidOperation:
        return (0, "Invalid amount format")
    
    # Check for zero or negative (Decimal handles negative even if we checked string)
    if decimal_value <= 0:
        return (0, "Amount must be greater than 0")
    
    # Check decimal places
    if '.' in money_str:
        decimal_part = money_str.split('.')[1]
        if len(decimal_part) > 2:
            return (0, "Amount cannot have more than 2 decimal places")
    
    # Convert to cents: multiply by 100 and convert to int
    # Decimal ensures no floating-point precision issues
    cents = int(decimal_value * Decimal('100'))
    
    # Final validation: ensure cents > 0 (should be, but double-check)
    if cents <= 0:
        return (0, "Amount must be greater than 0")
    
    return (cents, "")


def validate_money_string(money_str: str) -> bool:
    """
    Validate a money string without converting.
    Returns True if valid, False otherwise.
    """
    cents, error = parse_money_to_cents(money_str)
    return error == ""


