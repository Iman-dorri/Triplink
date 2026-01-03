"""
Standalone test for format_cents_to_string function.
Run with: python3 backend/tests/test_format_cents.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def format_cents_to_string(cents: int) -> str:
    """Format integer cents to string with exactly 2 decimal places. Uses integer math, no floats."""
    sign = "-" if cents < 0 else ""
    abs_cents = abs(cents)
    whole = abs_cents // 100
    frac = abs_cents % 100
    return f"{sign}{whole}.{frac:02d}"


def test_format_cents_to_string():
    """Test format_cents_to_string function with integer math"""
    test_cases = [
        (1230, "12.30"),
        (1, "0.01"),
        (100000, "1000.00"),
        (-50, "-0.50"),
        (0, "0.00"),
        (99, "0.99"),
        (100, "1.00"),
        (123456, "1234.56"),
        (-1230, "-12.30"),
        (-1, "-0.01"),
    ]
    
    print("Testing format_cents_to_string...\n")
    all_passed = True
    
    for cents, expected in test_cases:
        result = format_cents_to_string(cents)
        if result == expected:
            print(f"✅ {cents} -> '{result}'")
        else:
            print(f"❌ {cents} -> expected '{expected}', got '{result}'")
            all_passed = False
    
    if all_passed:
        print("\n✅ All format_cents_to_string tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(test_format_cents_to_string())


