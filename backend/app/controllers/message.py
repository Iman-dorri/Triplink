from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.models.connection import UserConnection, ConnectionStatus
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageWithUser,
    ChatConversation
)
from app.controllers.auth import get_current_user
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("/", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user."""
    # Convert string receiver_id to UUID for database queries
    try:
        receiver_uuid = UUID(message_data.receiver_id) if isinstance(message_data.receiver_id, str) else message_data.receiver_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid receiver ID format"
        )
    
    # Check if user is trying to message themselves
    if receiver_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself"
        )
    
    # Check if receiver exists
    receiver = db.query(User).filter(User.id == receiver_uuid).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver not found"
        )
    
    # Check if users are connected (accepted connection)
    connection = db.query(UserConnection).filter(
        or_(
            and_(
                UserConnection.user_id == current_user.id,
                UserConnection.connected_user_id == receiver_uuid,
                UserConnection.status == ConnectionStatus.ACCEPTED.value
            ),
            and_(
                UserConnection.user_id == receiver_uuid,
                UserConnection.connected_user_id == current_user.id,
                UserConnection.status == ConnectionStatus.ACCEPTED.value
            )
        )
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be connected to send messages"
        )
    
    # Create message
    new_message = Message(
        sender_id=current_user.id,
        receiver_id=receiver_uuid,
        content=message_data.content,
        is_read=False
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return MessageResponse(
        id=str(new_message.id),
        sender_id=str(new_message.sender_id),
        receiver_id=str(new_message.receiver_id),
        content=new_message.content,
        is_read=new_message.is_read,
        created_at=new_message.created_at
    )

@router.get("/conversation/{user_id}", response_model=List[MessageWithUser])
async def get_conversation(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation messages with a specific user."""
    # Convert string user_id to UUID for database queries
    try:
        target_user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Check if users are connected
    connection = db.query(UserConnection).filter(
        or_(
            and_(
                UserConnection.user_id == current_user.id,
                UserConnection.connected_user_id == target_user_uuid,
                UserConnection.status == ConnectionStatus.ACCEPTED.value
            ),
            and_(
                UserConnection.user_id == target_user_uuid,
                UserConnection.connected_user_id == current_user.id,
                UserConnection.status == ConnectionStatus.ACCEPTED.value
            )
        )
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be connected to view messages"
        )
    
    # Get messages between current user and target user
    messages = db.query(Message).filter(
        or_(
            and_(
                Message.sender_id == current_user.id,
                Message.receiver_id == target_user_uuid
            ),
            and_(
                Message.sender_id == target_user_uuid,
                Message.receiver_id == current_user.id
            )
        )
    ).order_by(desc(Message.created_at)).limit(limit).offset(offset).all()
    
    # Mark messages as read if they were sent to current user
    for message in messages:
        if message.receiver_id == current_user.id and not message.is_read:
            message.is_read = True
    db.commit()
    
    # Get user info
    other_user = db.query(User).filter(User.id == target_user_uuid).first()
    
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        result.append(MessageWithUser(
            id=str(msg.id),
            sender_id=str(msg.sender_id),
            receiver_id=str(msg.receiver_id),
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at,
            sender={
                "id": str(current_user.id) if msg.sender_id == current_user.id else str(other_user.id),
                "email": current_user.email if msg.sender_id == current_user.id else other_user.email,
                "first_name": current_user.first_name if msg.sender_id == current_user.id else other_user.first_name,
                "last_name": current_user.last_name if msg.sender_id == current_user.id else other_user.last_name,
                "avatar_url": current_user.avatar_url if msg.sender_id == current_user.id else other_user.avatar_url
            } if other_user else None,
            receiver={
                "id": str(current_user.id) if msg.receiver_id == current_user.id else str(other_user.id),
                "email": current_user.email if msg.receiver_id == current_user.id else other_user.email,
                "first_name": current_user.first_name if msg.receiver_id == current_user.id else other_user.first_name,
                "last_name": current_user.last_name if msg.receiver_id == current_user.id else other_user.last_name,
                "avatar_url": current_user.avatar_url if msg.receiver_id == current_user.id else other_user.avatar_url
            } if other_user else None
        ))
    
    return result

@router.get("/conversations", response_model=List[ChatConversation])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user."""
    # Get all accepted connections
    connections = db.query(UserConnection).filter(
        or_(
            UserConnection.user_id == current_user.id,
            UserConnection.connected_user_id == current_user.id
        ),
        UserConnection.status == ConnectionStatus.ACCEPTED.value
    ).all()
    
    conversations = []
    
    for conn in connections:
        # Determine the other user
        if conn.user_id == current_user.id:
            other_user_id = conn.connected_user_id
        else:
            other_user_id = conn.user_id
        
        other_user = db.query(User).filter(User.id == other_user_id).first()
        if not other_user:
            continue
        
        # Get last message in conversation
        last_message = db.query(Message).filter(
            or_(
                and_(
                    Message.sender_id == current_user.id,
                    Message.receiver_id == other_user_id
                ),
                and_(
                    Message.sender_id == other_user_id,
                    Message.receiver_id == current_user.id
                )
            )
        ).order_by(desc(Message.created_at)).first()
        
        # Count unread messages
        unread_count = db.query(Message).filter(
            Message.sender_id == other_user_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).count()
        
        conversations.append(ChatConversation(
            user_id=str(other_user.id),
            user_name=f"{other_user.first_name} {other_user.last_name}",
            user_avatar=other_user.avatar_url,
            last_message=MessageResponse(
                id=str(last_message.id),
                sender_id=str(last_message.sender_id),
                receiver_id=str(last_message.receiver_id),
                content=last_message.content,
                is_read=last_message.is_read,
                created_at=last_message.created_at
            ) if last_message else None,
            unread_count=unread_count
        ))
    
    # Sort by last message time (most recent first)
    conversations.sort(
        key=lambda x: x.last_message.created_at if x.last_message else None,
        reverse=True
    )
    
    return conversations

@router.put("/{message_id}/read")
async def mark_message_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.receiver_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.is_read = True
    db.commit()
    
    return {"message": "Message marked as read"}

