from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.connection import ConnectionStatus

class ConnectionBase(BaseModel):
    connected_user_id: str

class ConnectionCreate(ConnectionBase):
    pass

class ConnectionResponse(BaseModel):
    id: str
    user_id: str
    connected_user_id: str
    status: ConnectionStatus
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ConnectionWithUser(BaseModel):
    id: str
    user_id: str
    connected_user_id: str
    status: ConnectionStatus
    created_at: datetime
    updated_at: Optional[datetime]
    connected_user: Optional[dict] = None  # Will be populated with user info
    
    class Config:
        from_attributes = True

class ConnectionUpdate(BaseModel):
    status: ConnectionStatus

class UserSearchResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    connection_status: Optional[ConnectionStatus] = None  # Current connection status with requesting user
    
    class Config:
        from_attributes = True



