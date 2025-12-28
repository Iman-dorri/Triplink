from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.models.trip import Trip, TripParticipant
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
from datetime import datetime, timezone

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("/", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user or to a trip group chat."""
    # Validate that either receiver_id or trip_id is provided, but not both
    if not message_data.receiver_id and not message_data.trip_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either receiver_id or trip_id must be provided"
        )
    
    if message_data.receiver_id and message_data.trip_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both receiver_id and trip_id"
        )
    
    # Handle trip group chat
    if message_data.trip_id:
        try:
            trip_uuid = UUID(message_data.trip_id) if isinstance(message_data.trip_id, str) else message_data.trip_id
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid trip ID format"
            )
        
        trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
        
        # Check if user is a participant
        user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
        participant = db.query(TripParticipant).filter(
            TripParticipant.trip_id == trip_uuid,
            TripParticipant.user_id == user_uuid,
            TripParticipant.status == "accepted"
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a participant of this trip to send messages"
            )
        
        # Create message for trip
        new_message = Message(
            sender_id=current_user.id,
            receiver_id=None,
            trip_id=trip_uuid,
            content=message_data.content,
            is_read=False
        )
        
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        return MessageResponse(
            id=str(new_message.id),
            sender_id=str(new_message.sender_id),
            receiver_id=None,
            trip_id=str(new_message.trip_id),
            content=new_message.content,
            is_read=new_message.is_read,
            created_at=new_message.created_at
        )
    
    # Handle 1-on-1 chat
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
        trip_id=None,
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
        trip_id=None,
        content=new_message.content,
        is_read=new_message.is_read,
        created_at=new_message.created_at
    )

@router.get("/trip/{trip_id}", response_model=List[MessageWithUser])
async def get_trip_messages(
    trip_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a trip group chat."""
    try:
        trip_uuid = UUID(trip_id) if isinstance(trip_id, str) else trip_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip ID format"
        )
    
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user is a participant
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participant = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.user_id == user_uuid,
        TripParticipant.status == "accepted"
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a participant of this trip to view messages"
        )
    
    # Get messages for the trip
    messages = db.query(Message).filter(
        Message.trip_id == trip_uuid
    ).order_by(desc(Message.created_at)).limit(limit).offset(offset).all()
    
    # Mark messages as read if they were sent to current user
    for message in messages:
        if message.sender_id != current_user.id and not message.is_read:
            message.is_read = True
    db.commit()
    
    # Get all participants for user info
    participants = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.status == "accepted"
    ).all()
    
    participant_user_ids = [p.user_id for p in participants]
    participant_users = db.query(User).filter(
        User.id.in_(participant_user_ids)
    ).all()
    
    user_map = {str(u.id): u for u in participant_users}
    
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        sender = user_map.get(str(msg.sender_id))
        result.append(MessageWithUser(
            id=str(msg.id),
            sender_id=str(msg.sender_id),
            receiver_id=None,
            trip_id=str(msg.trip_id),
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at,
            sender={
                "id": str(sender.id),
                "email": sender.email if sender.status != 'pending_deletion' else None,
                "username": sender.username if sender.status != 'pending_deletion' else None,
                "first_name": "Deleted" if sender.status == 'pending_deletion' else sender.first_name,
                "last_name": "User" if sender.status == 'pending_deletion' else sender.last_name,
                "avatar_url": sender.avatar_url if sender.status != 'pending_deletion' else None
            } if sender else None,
            receiver=None
        ))
    
    return result

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
    
    # Get messages between current user and target user (only 1-on-1, not trip messages)
    messages = db.query(Message).filter(
        and_(
            or_(
                and_(
                    Message.sender_id == current_user.id,
                    Message.receiver_id == target_user_uuid
                ),
                and_(
                    Message.sender_id == target_user_uuid,
                    Message.receiver_id == current_user.id
                )
            ),
            Message.trip_id.is_(None)  # Only 1-on-1 messages
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
            receiver_id=str(msg.receiver_id) if msg.receiver_id else None,
            trip_id=None,
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at,
            sender={
                "id": str(current_user.id) if msg.sender_id == current_user.id else str(other_user.id),
                "email": current_user.email if msg.sender_id == current_user.id else (other_user.email if other_user and other_user.status != 'pending_deletion' else None),
                "username": current_user.username if msg.sender_id == current_user.id else (other_user.username if other_user and other_user.status != 'pending_deletion' else None),
                "first_name": current_user.first_name if msg.sender_id == current_user.id else ("Deleted" if other_user and other_user.status == 'pending_deletion' else (other_user.first_name if other_user else None)),
                "last_name": current_user.last_name if msg.sender_id == current_user.id else ("User" if other_user and other_user.status == 'pending_deletion' else (other_user.last_name if other_user else None)),
                "avatar_url": current_user.avatar_url if msg.sender_id == current_user.id else (other_user.avatar_url if other_user and other_user.status != 'pending_deletion' else None)
            } if other_user else None,
            receiver={
                "id": str(current_user.id) if msg.receiver_id == current_user.id else str(other_user.id),
                "email": current_user.email if msg.receiver_id == current_user.id else (other_user.email if other_user and other_user.status != 'pending_deletion' else None),
                "username": current_user.username if msg.receiver_id == current_user.id else (other_user.username if other_user and other_user.status != 'pending_deletion' else None),
                "first_name": current_user.first_name if msg.receiver_id == current_user.id else ("Deleted" if other_user and other_user.status == 'pending_deletion' else (other_user.first_name if other_user else None)),
                "last_name": current_user.last_name if msg.receiver_id == current_user.id else ("User" if other_user and other_user.status == 'pending_deletion' else (other_user.last_name if other_user else None)),
                "avatar_url": current_user.avatar_url if msg.receiver_id == current_user.id else (other_user.avatar_url if other_user and other_user.status != 'pending_deletion' else None)
            } if other_user else None
        ))
    
    return result

@router.get("/conversations", response_model=List[ChatConversation])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user (both 1-on-1 and trip group chats)."""
    conversations = []
    
    # Convert current_user.id to string for comparison (UserConnection uses String columns)
    user_id_str = str(current_user.id)
    
    # Get all accepted connections for 1-on-1 chats
    connections = db.query(UserConnection).filter(
        or_(
            UserConnection.user_id == user_id_str,
            UserConnection.connected_user_id == user_id_str
        ),
        UserConnection.status == ConnectionStatus.ACCEPTED.value
    ).all()
    
    # Convert current_user.id to UUID once for Message queries (Message uses UUID columns)
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    for conn in connections:
        # Determine the other user - ensure we're comparing strings correctly
        # UserConnection stores IDs as strings, so convert both to strings for comparison
        conn_user_id_str = str(conn.user_id).strip() if conn.user_id else None
        conn_connected_id_str = str(conn.connected_user_id).strip() if conn.connected_user_id else None
        
        # Ensure we have valid IDs
        if not conn_user_id_str or not conn_connected_id_str:
            continue
        
        # Determine which one is the other user (not the current user)
        if conn_user_id_str == user_id_str:
            other_user_id_str = conn_connected_id_str
        elif conn_connected_id_str == user_id_str:
            other_user_id_str = conn_user_id_str
        else:
            # This shouldn't happen, but skip if neither matches
            continue
        
        # Safety check: make sure we're not using the same user (string comparison)
        if other_user_id_str == user_id_str:
            continue
        
        # Convert to UUID for User query
        try:
            other_user_id = UUID(other_user_id_str)
        except (ValueError, TypeError):
            continue
        
        # Final safety check: ensure other_user_id is different from user_uuid (UUID comparison)
        if other_user_id == user_uuid:
            continue
        
        other_user = db.query(User).filter(User.id == other_user_id).first()
        if not other_user:
            continue
        
        # Get last message in conversation (only 1-on-1)
        last_message = db.query(Message).filter(
            and_(
                or_(
                    and_(
                        Message.sender_id == user_uuid,
                        Message.receiver_id == other_user_id
                    ),
                    and_(
                        Message.sender_id == other_user_id,
                        Message.receiver_id == user_uuid
                    )
                ),
                Message.trip_id.is_(None)  # Only 1-on-1 messages
            )
        ).order_by(desc(Message.created_at)).first()
        
        # Count unread messages
        unread_count = db.query(Message).filter(
            Message.sender_id == other_user_id,
            Message.receiver_id == user_uuid,
            Message.is_read == False,
            Message.trip_id.is_(None)  # Only 1-on-1 messages
        ).count()
        
        # Anonymize deleted users
        if other_user.status == 'pending_deletion':
            user_name = "Deleted User"
            user_avatar = None
        else:
            user_name = f"{other_user.first_name} {other_user.last_name}"
            user_avatar = other_user.avatar_url
        
        conversations.append(ChatConversation(
            user_id=str(other_user.id),
            trip_id=None,
            user_name=user_name,
            trip_title=None,
            user_avatar=user_avatar,
            last_message=MessageResponse(
                id=str(last_message.id),
                sender_id=str(last_message.sender_id),
                receiver_id=str(last_message.receiver_id),
                trip_id=None,
                content=last_message.content,
                is_read=last_message.is_read,
                created_at=last_message.created_at
            ) if last_message else None,
            unread_count=unread_count
        ))
    
    # Get all trips where user is a participant for group chats
    # TripParticipant uses UUID columns, so use UUID
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    trip_participants = db.query(TripParticipant).filter(
        TripParticipant.user_id == user_uuid,
        TripParticipant.status == "accepted"
    ).all()
    
    for participant in trip_participants:
        trip = db.query(Trip).filter(Trip.id == participant.trip_id).first()
        if not trip:
            continue
        
        # Get last message in trip
        last_message = db.query(Message).filter(
            Message.trip_id == trip.id
        ).order_by(desc(Message.created_at)).first()
        
        # Count unread messages (messages not sent by current user)
        unread_count = db.query(Message).filter(
            Message.trip_id == trip.id,
            Message.sender_id != user_uuid,
            Message.is_read == False
        ).count()
        
        conversations.append(ChatConversation(
            user_id=None,
            trip_id=str(trip.id),
            user_name=None,
            trip_title=trip.title,
            user_avatar=None,
            last_message=MessageResponse(
                id=str(last_message.id),
                sender_id=str(last_message.sender_id),
                receiver_id=None,
                trip_id=str(last_message.trip_id),
                content=last_message.content,
                is_read=last_message.is_read,
                created_at=last_message.created_at
            ) if last_message else None,
            unread_count=unread_count
        ))
    
    # Sort by last message time (most recent first)
    # Conversations with messages come first, then those without
    conversations.sort(
        key=lambda x: x.last_message.created_at if x.last_message else datetime(1970, 1, 1, tzinfo=timezone.utc),
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

