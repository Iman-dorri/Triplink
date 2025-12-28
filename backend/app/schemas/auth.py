from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)  # Bcrypt limit is 72 bytes

class UserLogin(BaseModel):
    username_or_email: str = Field(..., min_length=1, description="Username or email address")
    password: str

class UserResponse(UserBase):
    id: str  # This will be converted from UUID to string
    is_verified: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenWithUser(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
