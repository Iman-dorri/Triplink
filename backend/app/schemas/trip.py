from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime

class TripBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    budget_currency: Optional[str] = Field(None, max_length=3, description="ISO 4217 currency code (e.g., USD, EUR, GBP)")
    start_date: Optional[Union[datetime, str]] = None
    end_date: Optional[Union[datetime, str]] = None
    status: Optional[str] = "planning"
    
    @field_validator('start_date', 'end_date', mode='before')
    @classmethod
    def parse_date(cls, v):
        if v is None or isinstance(v, datetime):
            return v
        if isinstance(v, str):
            if not v.strip():  # Empty string
                return None
            try:
                # Try parsing ISO format
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                try:
                    # Try parsing date-only format (YYYY-MM-DD)
                    return datetime.strptime(v, '%Y-%m-%d')
                except ValueError:
                    # If parsing fails, return None
                    return None
        return v

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    budget_currency: Optional[str] = Field(None, max_length=3, description="ISO 4217 currency code (e.g., USD, EUR, GBP)")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

class TripParticipantResponse(BaseModel):
    id: str
    user_id: str
    role: str
    status: str
    invited_at: datetime
    joined_at: Optional[datetime] = None
    user: Optional[dict] = None  # Will contain user info
    
    class Config:
        from_attributes = True

class TripResponse(TripBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    participants: Optional[List[TripParticipantResponse]] = None
    
    class Config:
        from_attributes = True

class TripInviteRequest(BaseModel):
    user_ids: List[str] = Field(..., min_items=1, description="List of user IDs to invite")

class TripParticipantUpdate(BaseModel):
    status: str = Field(..., description="Status: 'accepted' or 'declined'")

