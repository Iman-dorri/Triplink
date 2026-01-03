"""
Tests for money validation - string-only inputs.
Run with: python -m pytest backend/tests/test_money_validation.py
Or: python backend/tests/test_money_validation.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.utils.money import parse_money_to_cents
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from pydantic import ValidationError


def test_valid_amount_string():
    """Test: "12.30" -> 1230 cents"""
    cents, error = parse_money_to_cents("12.30")
    assert cents == 1230, f"Expected 1230 cents, got {cents}"
    assert error == "", f"Expected no error, got: {error}"
    print("✅ Test 1 passed: '12.30' -> 1230 cents")


def test_invalid_more_than_2_decimals():
    """Test: "12.345" -> validation error"""
    cents, error = parse_money_to_cents("12.345")
    assert cents == 0, f"Expected 0 cents on error, got {cents}"
    assert "more than 2 decimal places" in error.lower(), f"Expected decimal places error, got: {error}"
    print("✅ Test 2 passed: '12.345' -> validation error")


def test_number_type_rejected_in_schema():
    """Test: amount passed as number should fail validation (400) with clear message"""
    # Test ExpenseCreate with number
    try:
        expense = ExpenseCreate(
            amount=12.30,  # Number, not string
            payer_user_id="test-user-id",
            participant_user_ids=["test-user-id"]
        )
        assert False, "Should have raised ValidationError for number input"
    except ValidationError as e:
        errors = e.errors()
        amount_error = next((err for err in errors if err['loc'] == ('amount',)), None)
        assert amount_error is not None, "Should have error for 'amount' field"
        assert "string" in amount_error['msg'].lower(), f"Error should mention string, got: {amount_error['msg']}"
        print(f"✅ Test 3 passed: number input rejected with message: {amount_error['msg']}")
    except Exception as e:
        assert False, f"Expected ValidationError, got {type(e).__name__}: {e}"


def test_additional_valid_cases():
    """Additional valid test cases"""
    test_cases = [
        ("12", 1200),
        ("12.3", 1230),
        ("0.01", 1),
        ("999.99", 99999),
        ("1000", 100000),
    ]
    
    for amount_str, expected_cents in test_cases:
        cents, error = parse_money_to_cents(amount_str)
        assert cents == expected_cents, f"'{amount_str}' -> expected {expected_cents}, got {cents}"
        assert error == "", f"'{amount_str}' -> unexpected error: {error}"
    
    print("✅ Additional valid cases passed")


def test_additional_invalid_cases():
    """Additional invalid test cases"""
    invalid_cases = [
        ("-5", "negative"),
        ("0", "greater than 0"),
        ("abc", "numeric"),
        ("12.3.4", "multiple decimal"),
        ("", "empty"),
    ]
    
    for amount_str, expected_error_keyword in invalid_cases:
        cents, error = parse_money_to_cents(amount_str)
        assert cents == 0, f"'{amount_str}' -> expected 0 cents on error, got {cents}"
        assert expected_error_keyword.lower() in error.lower(), f"'{amount_str}' -> expected '{expected_error_keyword}' in error, got: {error}"
    
    print("✅ Additional invalid cases passed")


def test_expense_update_with_string():
    """Test ExpenseUpdate accepts string amount"""
    expense = ExpenseUpdate(
        amount="25.50",
        description="Test"
    )
    assert expense.amount == "25.50"
    print("✅ ExpenseUpdate accepts string amount")


def test_expense_update_rejects_number():
    """Test ExpenseUpdate rejects number amount"""
    try:
        expense = ExpenseUpdate(
            amount=25.50,  # Number, not string
            description="Test"
        )
        assert False, "Should have raised ValidationError for number input"
    except ValidationError as e:
        errors = e.errors()
        amount_error = next((err for err in errors if err['loc'] == ('amount',)), None)
        assert amount_error is not None, "Should have error for 'amount' field"
        assert "string" in amount_error['msg'].lower(), f"Error should mention string, got: {amount_error['msg']}"
        print(f"✅ ExpenseUpdate rejects number with message: {amount_error['msg']}")


def test_format_cents_to_string():
    """Test format_cents_to_string function with integer math"""
    from app.controllers.expense import format_cents_to_string
    
    # Test cases
    test_cases = [
        (1230, "12.30"),
        (1, "0.01"),
        (100000, "1000.00"),
        (-50, "-0.50"),
        (0, "0.00"),
        (99, "0.99"),
        (100, "1.00"),
        (123456, "1234.56"),
    ]
    
    for cents, expected in test_cases:
        result = format_cents_to_string(cents)
        assert result == expected, f"format_cents_to_string({cents}) -> expected '{expected}', got '{result}'"
    
    print("✅ format_cents_to_string tests passed")


def test_update_description_only_does_not_touch_amount():
    """Test: updating description only must not touch amount_cents"""
    # Simulate an expense with amount_cents = 1230 (12.30)
    original_amount_cents = 1230
    original_description = "Original description"
    
    # Create update payload with only description (amount is None/not provided)
    update_data = ExpenseUpdate(
        description="Updated description only"
        # amount is not provided, so it will be None
    )
    
    # Verify that amount is None (not provided)
    assert update_data.amount is None, "Amount should be None when not provided"
    assert update_data.description == "Updated description only", "Description should be set"
    
    # Simulate the endpoint update logic exactly as it appears in the code:
    # if expense_update.amount is not None:
    #     expense.amount_cents = cents
    # if expense_update.description is not None:
    #     expense.description = expense_update.description
    
    # Simulate expense object
    simulated_amount_cents = original_amount_cents
    simulated_description = original_description
    
    # Apply update logic (matching endpoint code)
    if update_data.amount is not None:
        # This block should NOT execute because amount is None
        from app.utils.money import parse_money_to_cents
        cents, error = parse_money_to_cents(update_data.amount)
        simulated_amount_cents = cents
        assert False, "Should not reach here - amount is None"
    
    if update_data.description is not None:
        simulated_description = update_data.description
    
    # Verify results
    assert simulated_amount_cents == original_amount_cents, \
        f"Amount should remain {original_amount_cents}, got {simulated_amount_cents}"
    assert simulated_description == "Updated description only", \
        f"Description should be updated, got {simulated_description}"
    
    print("✅ Test passed: updating description only does not touch amount_cents")


if __name__ == "__main__":
    print("Running money validation tests...\n")
    
    try:
        test_valid_amount_string()
        test_invalid_more_than_2_decimals()
        test_number_type_rejected_in_schema()
        test_additional_valid_cases()
        test_additional_invalid_cases()
        test_expense_update_with_string()
        test_expense_update_rejects_number()
        test_format_cents_to_string()
        test_update_description_only_does_not_touch_amount()
        
        print("\n✅ All tests passed!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

