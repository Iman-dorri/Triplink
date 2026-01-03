# String Money Response Update

## Summary

All API responses now return money values as **strings with 2 decimals** and **integer cents**, avoiding JSON number (float) types.

## Updated Response Models

### ExpenseResponse

```python
class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    created_by_user_id: str
    payer_user_id: str
    amount: str = Field(..., description="Amount as string with 2 decimals (e.g., '12.30')")
    amount_cents: int = Field(..., description="Amount in cents (integer)")
    description: Optional[str] = None
    # ... other fields
```

### ExpenseSplitResponse

```python
class ExpenseSplitResponse(BaseModel):
    id: str
    user_id: str
    share: str = Field(..., description="Share amount as string with 2 decimals (e.g., '12.30')")
    share_cents: int = Field(..., description="Share amount in cents (integer)")
    user: Optional[Dict[str, Any]] = None
```

## Helper Function

**Location:** `backend/app/controllers/expense.py` (line 24)

```python
def format_cents_to_string(cents: int) -> str:
    """Format integer cents to string with exactly 2 decimal places."""
    dollars = cents / 100.0
    return f"{dollars:.2f}"
```

**Examples:**
- `format_cents_to_string(1230)` → `"12.30"`
- `format_cents_to_string(1)` → `"0.01"`
- `format_cents_to_string(100000)` → `"1000.00"`

## Example API Response

### Before (with floats):
```json
{
  "id": "770e8400-...",
  "amount": 12.30,
  "splits": [
    {
      "id": "990e8400-...",
      "share": 6.15
    }
  ]
}
```

### After (with strings and cents):
```json
{
  "id": "770e8400-...",
  "amount": "12.30",
  "amount_cents": 1230,
  "splits": [
    {
      "id": "990e8400-...",
      "share": "6.15",
      "share_cents": 615
    }
  ]
}
```

## Updated Endpoints

All expense endpoints now return money as strings:
- ✅ `POST /expenses/trips/{trip_id}/expenses` - Create expense
- ✅ `PATCH /expenses/{expense_id}` - Update expense
- ✅ `POST /expenses/{expense_id}/void` - Void expense
- ✅ `GET /expenses/trips/{trip_id}/expenses` - Get trip expenses

## Benefits

1. **No floating-point precision issues** - Money is stored and returned as integer cents
2. **Exact representation** - Strings preserve exact decimal representation
3. **Dual format** - Both human-readable string and integer cents for calculations
4. **Consistent API** - All money values follow the same format


