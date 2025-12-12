from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MessageCreate(BaseModel):
    receiver_id: Optional[str] = None  # For 1-on-1 chats
    trip_id: Optional[str] = None  # For group chats
    content: str = Field(..., min_length=1, max_length=5000)

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: Optional[str] = None
    trip_id: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageWithUser(BaseModel):
    id: str
    sender_id: str
    receiver_id: Optional[str] = None
    trip_id: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime
    sender: Optional[dict] = None
    receiver: Optional[dict] = None
    
    class Config:
        from_attributes = True

class ChatConversation(BaseModel):
    user_id: Optional[str] = None  # For 1-on-1 chats
    trip_id: Optional[str] = None  # For group chats
    user_name: Optional[str] = None
    trip_title: Optional[str] = None
    user_avatar: Optional[str] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
