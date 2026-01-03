from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.utils.money import parse_money_to_cents

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
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        """Validate expense type."""
        if v not in ['NORMAL', 'ADJUSTMENT']:
            raise ValueError("Type must be 'NORMAL' or 'ADJUSTMENT'")
        return v

class ExpenseCreate(ExpenseBase):
    pass

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

class ExpenseSplitResponse(BaseModel):
    id: str
    user_id: str
    share: str = Field(..., description="Share amount as string with 2 decimals (e.g., '12.30')")
    share_cents: int = Field(..., description="Share amount in cents (integer)")
    user: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    created_by_user_id: str
    payer_user_id: str
    amount: str = Field(..., description="Amount as string with 2 decimals (e.g., '12.30')")
    amount_cents: int = Field(..., description="Amount in cents (integer)")
    description: Optional[str] = None
    type: str
    adjusts_expense_id: Optional[str] = None
    status: str
    voided_at: Optional[datetime] = None
    voided_by_user_id: Optional[str] = None
    is_locked: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    splits: Optional[List[ExpenseSplitResponse]] = None
    creator: Optional[Dict[str, Any]] = None
    payer: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class SettlementCreate(BaseModel):
    expense_ids: List[str] = Field(..., min_items=1, description="List of expense IDs to include in the settlement")

class SettlementResponse(BaseModel):
    id: str
    trip_id: str
    created_by_user_id: str
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    expense_ids: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class ExpenseAuditLogResponse(BaseModel):
    id: str
    expense_id: str
    actor_user_id: str
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: datetime
    actor: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

