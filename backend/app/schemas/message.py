from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MessageBase(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1, max_length=5000)

class MessageCreate(MessageBase):
    pass

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageWithUser(MessageResponse):
    sender: Optional[dict] = None  # Will be populated with sender info
    receiver: Optional[dict] = None  # Will be populated with receiver info

class ChatConversation(BaseModel):
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

