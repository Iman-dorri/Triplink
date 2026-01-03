"""
Tests for expense split calculation - remainder cents go to payer.
Run with: python -m pytest backend/tests/test_expense_split.py
Or: python backend/tests/test_expense_split.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.controllers.expense import calculate_equal_split


def test_remainder_goes_to_payer_at_index_0():
    """Test: When payer is at index 0, remainder goes to payer"""
    # 100 cents split among 3 participants = 33 each + 1 remainder
    # Payer at index 0 should get 34, others get 33
    shares = calculate_equal_split(100, 3, payer_index=0)
    assert shares == [34, 33, 33], f"Expected [34, 33, 33], got {shares}"
    assert sum(shares) == 100, f"Sum should be 100, got {sum(shares)}"
    print("✅ Test 1 passed: Remainder goes to payer at index 0")


def test_remainder_goes_to_payer_at_index_1():
    """Test: When payer is at index 1 (NOT first), remainder still goes to payer"""
    # 100 cents split among 3 participants = 33 each + 1 remainder
    # Payer at index 1 should get 34, others get 33
    shares = calculate_equal_split(100, 3, payer_index=1)
    assert shares == [33, 34, 33], f"Expected [33, 34, 33], got {shares}"
    assert sum(shares) == 100, f"Sum should be 100, got {sum(shares)}"
    print("✅ Test 2 passed: Remainder goes to payer at index 1 (not first)")


def test_remainder_goes_to_payer_at_index_2():
    """Test: When payer is at index 2 (last), remainder goes to payer"""
    # 100 cents split among 3 participants = 33 each + 1 remainder
    # Payer at index 2 should get 34, others get 33
    shares = calculate_equal_split(100, 3, payer_index=2)
    assert shares == [33, 33, 34], f"Expected [33, 33, 34], got {shares}"
    assert sum(shares) == 100, f"Sum should be 100, got {sum(shares)}"
    print("✅ Test 3 passed: Remainder goes to payer at index 2 (last)")


def test_larger_remainder():
    """Test: Larger remainder (e.g., 2 cents) goes to payer"""
    # 102 cents split among 3 participants = 34 each + 0 remainder
    # Actually: 102 // 3 = 34, 102 % 3 = 0, so no remainder
    # Let's use 101 cents: 101 // 3 = 33, 101 % 3 = 2
    shares = calculate_equal_split(101, 3, payer_index=1)
    assert shares == [33, 35, 33], f"Expected [33, 35, 33], got {shares}"
    assert sum(shares) == 101, f"Sum should be 101, got {sum(shares)}"
    print("✅ Test 4 passed: Larger remainder (2 cents) goes to payer")


def test_no_remainder():
    """Test: When amount divides evenly, all get equal share"""
    # 100 cents split among 2 participants = 50 each, no remainder
    shares = calculate_equal_split(100, 2, payer_index=0)
    assert shares == [50, 50], f"Expected [50, 50], got {shares}"
    assert sum(shares) == 100, f"Sum should be 100, got {sum(shares)}"
    print("✅ Test 5 passed: No remainder, all get equal share")


def test_single_participant():
    """Test: Single participant gets all amount"""
    shares = calculate_equal_split(123, 1, payer_index=0)
    assert shares == [123], f"Expected [123], got {shares}"
    assert sum(shares) == 123, f"Sum should be 123, got {sum(shares)}"
    print("✅ Test 6 passed: Single participant gets all amount")


def test_payer_index_validation():
    """Test: Invalid payer_index raises ValueError"""
    try:
        calculate_equal_split(100, 3, payer_index=-1)
        assert False, "Should have raised ValueError for negative payer_index"
    except ValueError as e:
        assert "out of range" in str(e).lower(), f"Expected 'out of range' in error, got: {e}"
        print("✅ Test 7 passed: Negative payer_index raises ValueError")
    
    try:
        calculate_equal_split(100, 3, payer_index=3)
        assert False, "Should have raised ValueError for payer_index >= num_participants"
    except ValueError as e:
        assert "out of range" in str(e).lower(), f"Expected 'out of range' in error, got: {e}"
        print("✅ Test 8 passed: payer_index >= num_participants raises ValueError")


def test_real_world_scenario():
    """Test: Real-world scenario - $12.50 split 3 ways, payer not first"""
    # $12.50 = 1250 cents
    # 1250 // 3 = 416, 1250 % 3 = 2
    # So: 416 + 416 + 418 = 1250
    # If payer is at index 2, they get 418
    shares = calculate_equal_split(1250, 3, payer_index=2)
    assert shares == [416, 416, 418], f"Expected [416, 416, 418], got {shares}"
    assert sum(shares) == 1250, f"Sum should be 1250, got {sum(shares)}"
    print("✅ Test 9 passed: Real-world scenario - $12.50 split 3 ways")


def test_payer_in_middle_of_large_list():
    """Test: Payer in middle of large participant list gets remainder"""
    # 1000 cents split among 7 participants
    # 1000 // 7 = 142, 1000 % 7 = 6
    # Payer at index 3 should get 142 + 6 = 148
    shares = calculate_equal_split(1000, 7, payer_index=3)
    expected = [142, 142, 142, 148, 142, 142, 142]
    assert shares == expected, f"Expected {expected}, got {shares}"
    assert sum(shares) == 1000, f"Sum should be 1000, got {sum(shares)}"
    print("✅ Test 10 passed: Payer in middle of large list gets remainder")


if __name__ == "__main__":
    print("Running expense split calculation tests...\n")
    
    try:
        test_remainder_goes_to_payer_at_index_0()
        test_remainder_goes_to_payer_at_index_1()
        test_remainder_goes_to_payer_at_index_2()
        test_larger_remainder()
        test_no_remainder()
        test_single_participant()
        test_payer_index_validation()
        test_real_world_scenario()
        test_payer_in_middle_of_large_list()
        
        print("\n✅ All expense split tests passed!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

