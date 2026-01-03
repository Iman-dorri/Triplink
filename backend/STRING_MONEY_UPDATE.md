# String-Only Money Input Update

## Updated Pydantic Model Definitions

### ExpenseBase (used by ExpenseCreate)

```python
class ExpenseBase(BaseModel):
    amount: str = Field(..., description="Expense amount as string (e.g., '12.50'). Must have max 2 decimal places.")
    description: Optional[str] = None
    payer_user_id: str = Field(..., description="User ID of the person who paid")
    participant_user_ids: List[str] = Field(..., min_items=1, description="List of user IDs to split the expense among")
    type: str = Field(default='NORMAL', description="Expense type: 'NORMAL' or 'ADJUSTMENT'")
    adjusts_expense_id: Optional[str] = None
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        """Parse and validate amount string. Reject non-strings, empty, >2 decimals, <=0."""
        # Reject non-string types
        if not isinstance(v, str):
            raise ValueError("Amount must be a string (e.g., '12.50'). Numbers are not accepted.")
        
        # Reject empty string
        if not v.strip():
            raise ValueError("Amount cannot be empty")
        
        # Parse using strict money parser
        cents, error = parse_money_to_cents(v)
        if error:
            raise ValueError(error)
        
        # Return original string (controller will convert to cents)
        return v
```

### ExpenseUpdate

```python
class ExpenseUpdate(BaseModel):
    amount: Optional[str] = Field(None, description="Expense amount as string (e.g., '12.50'). Must have max 2 decimal places.")
    description: Optional[str] = None
    payer_user_id: Optional[str] = None
    participant_user_ids: Optional[List[str]] = Field(None, min_items=1)
    reason: Optional[str] = Field(None, description="Optional reason for the edit")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        """Parse and validate amount string if provided. Reject non-strings, empty, >2 decimals, <=0."""
        if v is None:
            return None
        
        # Reject non-string types
        if not isinstance(v, str):
            raise ValueError("Amount must be a string (e.g., '12.50'). Numbers are not accepted.")
        
        # Reject empty string
        if not v.strip():
            raise ValueError("Amount cannot be empty")
        
        # Parse using strict money parser
        cents, error = parse_money_to_cents(v)
        if error:
            raise ValueError(error)
        
        # Return original string (controller will convert to cents)
        return v
```

## Example Requests and Responses

### Create Expense Request

**Request:**
```http
POST /expenses/trips/{trip_id}/expenses
Content-Type: application/json

{
  "amount": "12.30",
  "description": "Dinner at restaurant",
  "payer_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "participant_user_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "type": "NORMAL"
}
```

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "trip_id": "880e8400-e29b-41d4-a716-446655440003",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "payer_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 12.30,
  "description": "Dinner at restaurant",
  "type": "NORMAL",
  "adjusts_expense_id": null,
  "status": "ACTIVE",
  "voided_at": null,
  "voided_by_user_id": null,
  "is_locked": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": null,
  "splits": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "share": 6.15,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "first_name": "John",
        "last_name": "Doe"
      }
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "share": 6.15,
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "username": "jane_smith",
        "first_name": "Jane",
        "last_name": "Smith"
      }
    }
  ],
  "creator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  },
  "payer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Error Response (400 Bad Request) - Number instead of string:**
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Amount must be a string (e.g., '12.50'). Numbers are not accepted.",
      "type": "value_error"
    }
  ]
}
```

**Error Response (400 Bad Request) - More than 2 decimals:**
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Amount cannot have more than 2 decimal places",
      "type": "value_error"
    }
  ]
}
```

### Update Expense Request

**Request:**
```http
PATCH /expenses/{expense_id}
Content-Type: application/json

{
  "amount": "25.50",
  "description": "Updated description",
  "reason": "Corrected the amount"
}
```

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "trip_id": "880e8400-e29b-41d4-a716-446655440003",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "payer_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 25.50,
  "description": "Updated description",
  "type": "NORMAL",
  "adjusts_expense_id": null,
  "status": "ACTIVE",
  "voided_at": null,
  "voided_by_user_id": null,
  "is_locked": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z",
  "splits": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "share": 12.75,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "first_name": "John",
        "last_name": "Doe"
      }
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "share": 12.75,
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "username": "jane_smith",
        "first_name": "Jane",
        "last_name": "Smith"
      }
    }
  ],
  "creator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  },
  "payer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Error Response (400 Bad Request) - Number instead of string:**
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Amount must be a string (e.g., '12.50'). Numbers are not accepted.",
      "type": "value_error"
    }
  ]
}
```

## Frontend Changes

### Web App
- Amount is sent as string: `amount: normalizedAmount` (not `parseFloat(expenseAmount)`)
- Amount string is normalized to ensure 2 decimal places if decimal exists

### Mobile App
- Amount is sent as string: `amount: normalizedAmount` (not `parseFloat(expenseAmount)`)
- Amount string is normalized to ensure 2 decimal places if decimal exists

## Test Results

Run tests with: `python backend/tests/test_money_validation.py`

**Expected output:**
```
Running money validation tests...

✅ Test 1 passed: '12.30' -> 1230 cents
✅ Test 2 passed: '12.345' -> validation error
✅ Test 3 passed: number input rejected with message: Amount must be a string (e.g., '12.50'). Numbers are not accepted.
✅ Additional valid cases passed
✅ Additional invalid cases passed
✅ ExpenseUpdate accepts string amount
✅ ExpenseUpdate rejects number with message: Amount must be a string (e.g., '12.50'). Numbers are not accepted.

✅ All tests passed!
```


