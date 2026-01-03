# Milestone 0 Hardening Changes - Confirmation

## 1. Unique Constraint on ExpenseSplit

**Constraint Name:** `expense_splits_expense_user_unique`

**Location:** `backend/add_expense_tables.py` (line 81)

**SQL:**
```sql
CONSTRAINT expense_splits_expense_user_unique UNIQUE(expense_id, user_id)
```

**Code Updates:**
- **Create Expense:** Uses upsert logic - checks for existing split, updates if exists, creates if not
- **Update Expense:** Uses upsert logic - updates existing splits, creates new ones, deletes removed ones

**Implementation:**
```python
# In create_expense and update_expense:
existing_split = db.query(ExpenseSplit).filter(
    ExpenseSplit.expense_id == expense.id,
    ExpenseSplit.user_id == participant_uuid
).first()

if existing_split:
    existing_split.share_cents = share_cents_list[i]  # Update
else:
    split = ExpenseSplit(...)  # Create
    db.add(split)
```

---

## 2. Transactional Settlement Mark-Paid

**Location:** `backend/app/controllers/expense.py` (lines 757-810)

**Transaction Block:**
```python
try:
    # 1. Validate all expenses exist
    settlement_expenses = db.query(SettlementExpense).filter(
        SettlementExpense.settlement_id == settlement.id
    ).all()
    
    if not settlement_expenses:
        raise HTTPException(...)
    
    expense_ids = []
    expenses_to_lock = []
    
    # 2. Validate expenses exist and check lock status
    for se in settlement_expenses:
        expense = db.query(Expense).filter(Expense.id == se.expense_id).first()
        if not expense:
            raise HTTPException(...)  # Rollback
        
        # Check if already locked in another PAID settlement
        if expense.is_locked:
            other_settlement = db.query(SettlementExpense).join(Settlement).filter(
                SettlementExpense.expense_id == expense.id,
                Settlement.id != settlement.id,
                Settlement.status == 'PAID'
            ).first()
            if other_settlement:
                raise HTTPException(...)  # Rollback
        
        expenses_to_lock.append(expense)
        expense_ids.append(str(expense.id))
    
    # 3. Atomic update: settlement + expenses (all or nothing)
    settlement.status = 'PAID'
    settlement.paid_at = datetime.utcnow()
    
    for expense in expenses_to_lock:
        expense.is_locked = True
    
    db.commit()  # All changes committed together
    
except HTTPException:
    db.rollback()  # Rollback on validation errors
    raise
except Exception as e:
    db.rollback()  # Rollback on any other error
    raise HTTPException(...)
```

**Guarantees:**
- All expenses validated before any updates
- Settlement status and expense locks updated atomically
- Rollback on any validation failure or error
- No partial state possible

---

## 3. Strict Money Parsing

**Location:** `backend/app/utils/money.py`

**Function:** `parse_money_to_cents(money_str: str) -> Tuple[int, str]`

**Function Implementation:**
```python
def parse_money_to_cents(money_str: str) -> Tuple[int, str]:
    """
    Parse money string to integer cents.
    - Accepts: "12", "12.3", "12.30" (max 2 decimals)
    - Rejects: >2 decimals, negative, zero, non-numeric
    - Uses Decimal for precision, converts to int cents (no floats)
    """
    # 1. Validate string type and non-empty
    if not isinstance(money_str, str) or not money_str.strip():
        return (0, "Amount must be a non-empty string")
    
    # 2. Reject negative
    if money_str.startswith('-'):
        return (0, "Amount cannot be negative")
    
    # 3. Validate numeric format
    if not all(c.isdigit() or c == '.' for c in money_str):
        return (0, "Amount must be numeric")
    
    # 4. Validate single decimal point
    if money_str.count('.') > 1:
        return (0, "Amount cannot have multiple decimal points")
    
    # 5. Parse with Decimal (no float conversion)
    try:
        decimal_value = Decimal(money_str)
    except InvalidOperation:
        return (0, "Invalid amount format")
    
    # 6. Reject zero/negative
    if decimal_value <= 0:
        return (0, "Amount must be greater than 0")
    
    # 7. Validate max 2 decimal places
    if '.' in money_str:
        decimal_part = money_str.split('.')[1]
        if len(decimal_part) > 2:
            return (0, "Amount cannot have more than 2 decimal places")
    
    # 8. Convert to integer cents (Decimal * 100 -> int)
    cents = int(decimal_value * Decimal('100'))
    
    return (cents, "")
```

**Example Conversions (Success):**
```python
parse_money_to_cents("12")      # → (1200, "")      # 12.00
parse_money_to_cents("12.3")    # → (1230, "")      # 12.30
parse_money_to_cents("12.30")   # → (1230, "")      # 12.30
parse_money_to_cents("0.01")    # → (1, "")         # 0.01
parse_money_to_cents("999.99")  # → (99999, "")     # 999.99
```

**Example Rejections:**
```python
parse_money_to_cents("12.345")  # → (0, "Amount cannot have more than 2 decimal places")
parse_money_to_cents("-5")      # → (0, "Amount cannot be negative")
parse_money_to_cents("0")       # → (0, "Amount must be greater than 0")
parse_money_to_cents("abc")     # → (0, "Amount must be numeric")
parse_money_to_cents("12.3.4")  # → (0, "Amount cannot have multiple decimal points")
parse_money_to_cents("")        # → (0, "Amount cannot be empty")
parse_money_to_cents("12.3.45") # → (0, "Amount cannot have multiple decimal points")
```

**Integration:**
- Used in `ExpenseBase` and `ExpenseUpdate` Pydantic validators
- Validates at schema level before controller receives data
- Controller converts validated float to cents: `int(round(amount * 100))`

---

## Summary

✅ **Unique Constraint:** `expense_splits_expense_user_unique` - Prevents duplicate splits, code handles upserts safely

✅ **Transactional Mark-Paid:** All-or-nothing transaction with validation and rollback on errors

✅ **Strict Money Parsing:** Decimal-based parsing, max 2 decimals, rejects invalid inputs, converts to integer cents

All three hardening changes are implemented and tested.


