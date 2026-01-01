from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.models.trip import Trip, TripParticipant
from app.models.connection import UserConnection, ConnectionStatus
from app.models.conversation_participant import ConversationParticipant
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageWithUser,
    ChatConversation,
    ClearChatRequest,
    DeleteMessageRequest,
    LeaveGroupRequest
)
from app.controllers.auth import get_current_user
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

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
            is_delivered=True,  # Trip messages are immediately "delivered" to all participants
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
            is_delivered=new_message.is_delivered,
            is_read=new_message.is_read,
            deleted_for_everyone_at=new_message.deleted_for_everyone_at,
            deleted_for_everyone_by=str(new_message.deleted_for_everyone_by) if new_message.deleted_for_everyone_by else None,
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
        is_delivered=False,  # Not delivered yet
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
        is_delivered=new_message.is_delivered,
        is_read=new_message.is_read,
        deleted_for_everyone_at=new_message.deleted_for_everyone_at,
        deleted_for_everyone_by=str(new_message.deleted_for_everyone_by) if new_message.deleted_for_everyone_by else None,
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
    
    # Check if user has cleared this chat or left the group
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    conv_participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_uuid,
        ConversationParticipant.trip_id == trip_uuid,
        ConversationParticipant.other_user_id.is_(None)
    ).first()
    
    cleared_at = conv_participant.cleared_at if conv_participant else None
    left_at = conv_participant.left_at if conv_participant else None
    
    # If user left the group, they shouldn't see messages
    if left_at:
        return []
    
    # Get messages for the trip
    # Include deleted messages (they will show "Message deleted" in UI)
    message_query = db.query(Message).filter(
        Message.trip_id == trip_uuid
    )
    
    # Filter by cleared_at if user has cleared the chat
    if cleared_at:
        message_query = message_query.filter(Message.created_at > cleared_at)
    
    messages = message_query.order_by(desc(Message.created_at)).limit(limit).offset(offset).all()
    
    # Mark messages as delivered and read if they were sent to current user
    # Note: Trip messages are already marked as delivered when created
    for message in messages:
        if message.sender_id != current_user.id:
            # Mark as read when participant views the conversation
            if not message.is_read:
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
            content=msg.content if not msg.deleted_for_everyone_at else "Message deleted",
            is_delivered=msg.is_delivered,
            is_read=msg.is_read,
            deleted_for_everyone_at=msg.deleted_for_everyone_at,
            deleted_for_everyone_by=str(msg.deleted_for_everyone_by) if msg.deleted_for_everyone_by else None,
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
    
    # Check if user has cleared this chat
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    conv_participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_uuid,
        ConversationParticipant.other_user_id == target_user_uuid,
        ConversationParticipant.trip_id.is_(None)
    ).first()
    
    cleared_at = conv_participant.cleared_at if conv_participant else None
    
    # Get messages between current user and target user (only 1-on-1, not trip messages)
    # Include deleted messages (they will show "Message deleted" in UI)
    message_query = db.query(Message).filter(
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
    )
    
    # Filter by cleared_at if user has cleared the chat
    if cleared_at:
        message_query = message_query.filter(Message.created_at > cleared_at)
    
    messages = message_query.order_by(desc(Message.created_at)).limit(limit).offset(offset).all()
    
    # Mark messages as delivered and read if they were sent to current user
    for message in messages:
        if message.receiver_id == current_user.id:
            # Mark as delivered when receiver fetches the conversation
            if not message.is_delivered:
                message.is_delivered = True
            # Mark as read when receiver views the conversation
            if not message.is_read:
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
            content=msg.content if not msg.deleted_for_everyone_at else "Message deleted",
            is_delivered=msg.is_delivered,
            is_read=msg.is_read,
            deleted_for_everyone_at=msg.deleted_for_everyone_at,
            deleted_for_everyone_by=str(msg.deleted_for_everyone_by) if msg.deleted_for_everyone_by else None,
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
        
        # Get last message in conversation (only 1-on-1, excluding deleted messages)
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
                Message.trip_id.is_(None),  # Only 1-on-1 messages
                Message.deleted_for_everyone_at.is_(None)  # Exclude deleted messages
            )
        ).order_by(desc(Message.created_at)).first()
        
        # Count unread messages (excluding deleted)
        unread_count = db.query(Message).filter(
            Message.sender_id == other_user_id,
            Message.receiver_id == user_uuid,
            Message.is_read == False,
            Message.trip_id.is_(None),  # Only 1-on-1 messages
            Message.deleted_for_everyone_at.is_(None)  # Exclude deleted messages
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
                content=last_message.content if not last_message.deleted_for_everyone_at else "Message deleted",
                is_delivered=last_message.is_delivered,
                is_read=last_message.is_read,
                deleted_for_everyone_at=last_message.deleted_for_everyone_at,
                deleted_for_everyone_by=str(last_message.deleted_for_everyone_by) if last_message.deleted_for_everyone_by else None,
                created_at=last_message.created_at
            ) if last_message and not last_message.deleted_for_everyone_at else None,
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
        
        # Get last message in trip (excluding deleted messages)
        last_message = db.query(Message).filter(
            and_(
                Message.trip_id == trip.id,
                Message.deleted_for_everyone_at.is_(None)  # Exclude deleted messages
            )
        ).order_by(desc(Message.created_at)).first()
        
        # Count unread messages (messages not sent by current user, excluding deleted)
        unread_count = db.query(Message).filter(
            Message.trip_id == trip.id,
            Message.sender_id != user_uuid,
            Message.is_read == False,
            Message.deleted_for_everyone_at.is_(None)  # Exclude deleted messages
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
                content=last_message.content if not last_message.deleted_for_everyone_at else "Message deleted",
                is_delivered=last_message.is_delivered,
                is_read=last_message.is_read,
                deleted_for_everyone_at=last_message.deleted_for_everyone_at,
                deleted_for_everyone_by=str(last_message.deleted_for_everyone_by) if last_message.deleted_for_everyone_by else None,
                created_at=last_message.created_at
            ) if last_message and not last_message.deleted_for_everyone_at else None,
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

@router.post("/clear-chat", status_code=status.HTTP_200_OK)
async def clear_chat(
    request: ClearChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear chat for the current user (does not delete messages, only hides them)."""
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    if request.user_id:
        # 1-on-1 chat
        try:
            other_user_uuid = UUID(request.user_id) if isinstance(request.user_id, str) else request.user_id
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
                    UserConnection.connected_user_id == other_user_uuid,
                    UserConnection.status == ConnectionStatus.ACCEPTED.value
                ),
                and_(
                    UserConnection.user_id == other_user_uuid,
                    UserConnection.connected_user_id == current_user.id,
                    UserConnection.status == ConnectionStatus.ACCEPTED.value
                )
            )
        ).first()
        
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be connected to clear this chat"
            )
        
        # Get or create conversation participant
        conv_participant = db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user_uuid,
            ConversationParticipant.other_user_id == other_user_uuid,
            ConversationParticipant.trip_id.is_(None)
        ).first()
        
        if not conv_participant:
            conv_participant = ConversationParticipant(
                user_id=user_uuid,
                other_user_id=other_user_uuid,
                trip_id=None,
                cleared_at=datetime.now(timezone.utc)
            )
            db.add(conv_participant)
        else:
            conv_participant.cleared_at = datetime.now(timezone.utc)
        
        db.commit()
        return {"message": "Chat cleared successfully"}
    
    elif request.trip_id:
        # Group chat
        try:
            trip_uuid = UUID(request.trip_id) if isinstance(request.trip_id, str) else request.trip_id
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid trip ID format"
            )
        
        # Check if user is a participant
        participant = db.query(TripParticipant).filter(
            TripParticipant.trip_id == trip_uuid,
            TripParticipant.user_id == user_uuid,
            TripParticipant.status == "accepted"
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a participant of this trip to clear the chat"
            )
        
        # Get or create conversation participant
        conv_participant = db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user_uuid,
            ConversationParticipant.trip_id == trip_uuid,
            ConversationParticipant.other_user_id.is_(None)
        ).first()
        
        if not conv_participant:
            conv_participant = ConversationParticipant(
                user_id=user_uuid,
                other_user_id=None,
                trip_id=trip_uuid,
                cleared_at=datetime.now(timezone.utc)
            )
            db.add(conv_participant)
        else:
            conv_participant.cleared_at = datetime.now(timezone.utc)
        
        db.commit()
        return {"message": "Chat cleared successfully"}
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or trip_id must be provided"
        )

@router.post("/delete-for-everyone", status_code=status.HTTP_200_OK)
async def delete_message_for_everyone(
    request: DeleteMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message for everyone (soft delete/tombstone). Only allowed within 7 days."""
    try:
        message_uuid = UUID(request.message_id) if isinstance(request.message_id, str) else request.message_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID format"
        )
    
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Get the message
    message = db.query(Message).filter(Message.id == message_uuid).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if message is already deleted
    if message.deleted_for_everyone_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is already deleted"
        )
    
    # Check if user is the sender
    if message.sender_id != user_uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages"
        )
    
    # Check time window: 7 days
    time_limit = datetime.now(timezone.utc) - timedelta(days=7)
    if message.created_at < time_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Messages can only be deleted within 7 days of sending"
        )
    
    # Soft delete the message (tombstone)
    message.deleted_for_everyone_at = datetime.now(timezone.utc)
    message.deleted_for_everyone_by = user_uuid
    # Optionally clear content for privacy (but keep it for now for potential recovery)
    
    db.commit()
    return {"message": "Message deleted for everyone"}

@router.post("/leave-group", status_code=status.HTTP_200_OK)
async def leave_group(
    request: LeaveGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group chat. User can no longer post/read new messages."""
    try:
        trip_uuid = UUID(request.trip_id) if isinstance(request.trip_id, str) else request.trip_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip ID format"
        )
    
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Check if user is a participant
    participant = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.user_id == user_uuid,
        TripParticipant.status == "accepted"
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant of this trip"
        )
    
    # Check if user is the creator (creators might not be allowed to leave, or handle differently)
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    if trip and trip.user_id == user_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trip creators cannot leave the group. Delete the trip instead."
        )
    
    # Get or create conversation participant and mark as left
    conv_participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_uuid,
        ConversationParticipant.trip_id == trip_uuid,
        ConversationParticipant.other_user_id.is_(None)
    ).first()
    
    if not conv_participant:
        conv_participant = ConversationParticipant(
            user_id=user_uuid,
            other_user_id=None,
            trip_id=trip_uuid,
            left_at=datetime.now(timezone.utc),
            cleared_at=datetime.now(timezone.utc)  # Also clear chat when leaving
        )
        db.add(conv_participant)
    else:
        conv_participant.left_at = datetime.now(timezone.utc)
        if not conv_participant.cleared_at:
            conv_participant.cleared_at = datetime.now(timezone.utc)
    
    # Update participant status to declined (or remove, depending on your business logic)
    # For now, we'll keep them as declined so they can't rejoin without a new invitation
    participant.status = "declined"
    
    db.commit()
    return {"message": "Left group successfully"}

@router.post("/admin/delete-message", status_code=status.HTTP_200_OK)
async def admin_delete_message(
    request: DeleteMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin delete a message (for group admins/creators)."""
    try:
        message_uuid = UUID(request.message_id) if isinstance(request.message_id, str) else request.message_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID format"
        )
    
    user_uuid = UUID(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Get the message
    message = db.query(Message).filter(Message.id == message_uuid).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if message is already deleted
    if message.deleted_for_everyone_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is already deleted"
        )
    
    # Check if message is from a group chat
    if not message.trip_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin delete is only available for group chat messages"
        )
    
    # Check if user is the trip creator or admin
    trip = db.query(Trip).filter(Trip.id == message.trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user is the creator
    if trip.user_id != user_uuid:
        # Check if user is an admin participant (if you have admin roles)
        participant = db.query(TripParticipant).filter(
            TripParticipant.trip_id == message.trip_id,
            TripParticipant.user_id == user_uuid,
            TripParticipant.role == "admin"  # If you have admin role
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only trip creators and admins can delete messages"
            )
    
    # Soft delete the message (tombstone)
    message.deleted_for_everyone_at = datetime.now(timezone.utc)
    message.deleted_for_everyone_by = user_uuid
    
    db.commit()
    return {"message": "Message deleted by admin"}

