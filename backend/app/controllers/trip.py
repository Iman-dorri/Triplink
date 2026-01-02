from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.user import User
from app.models.trip import Trip, TripParticipant
from app.models.connection import UserConnection, ConnectionStatus
from app.schemas.trip import (
    TripCreate, 
    TripUpdate, 
    TripResponse, 
    TripInviteRequest,
    TripParticipantUpdate,
    TripParticipantResponse
)
from app.controllers.auth import get_current_user
from typing import List, Optional
from datetime import datetime
from uuid import UUID as UUIDType

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripResponse)
async def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new trip."""
    # Create trip
    # Convert user_id to UUID if it's a string
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    new_trip = Trip(
        user_id=user_uuid,
        title=trip_data.title,
        description=trip_data.description,
        budget=trip_data.budget,
        budget_currency=trip_data.budget_currency or 'USD',
        start_date=trip_data.start_date,
        end_date=trip_data.end_date,
        status=trip_data.status or "planning"
    )
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    # Add creator as participant with accepted status
    # Convert user_id to UUID if it's a string
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    creator_participant = TripParticipant(
        trip_id=new_trip.id,
        user_id=user_uuid,
        role="creator",
        status="accepted",
        joined_at=datetime.utcnow()
    )
    db.add(creator_participant)
    db.commit()
    
    # Fetch trip with participants
    db.refresh(new_trip)
    
    return TripResponse(
        id=str(new_trip.id),
        user_id=str(new_trip.user_id),
        title=new_trip.title,
        description=new_trip.description,
        budget=float(new_trip.budget) if new_trip.budget else None,
        start_date=new_trip.start_date,
        end_date=new_trip.end_date,
        status=new_trip.status,
        created_at=new_trip.created_at,
        updated_at=new_trip.updated_at
    )

@router.get("/", response_model=List[TripResponse])
async def get_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all trips where the current user is a participant (accepted or pending)."""
    # Get all trips where user is a participant (both accepted and pending)
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participants = db.query(TripParticipant).filter(
        TripParticipant.user_id == user_uuid,
        TripParticipant.status.in_(["accepted", "pending"])
    ).all()
    
    trip_ids = [p.trip_id for p in participants]
    
    if not trip_ids:
        return []
    
    trips = db.query(Trip).filter(Trip.id.in_(trip_ids)).all()
    
    result = []
    for trip in trips:
        # Get participants for each trip
        trip_participants = db.query(TripParticipant).filter(
            TripParticipant.trip_id == trip.id
        ).all()
        
        participants_data = []
        for participant in trip_participants:
            user = db.query(User).filter(User.id == participant.user_id).first()
        participants_data.append(TripParticipantResponse(
            id=str(participant.id),
            user_id=str(participant.user_id),
            role=participant.role,
            status=participant.status,
            invited_at=participant.invited_at,
            joined_at=participant.joined_at,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "avatar_url": user.avatar_url
            } if user else None
        ))
        
        result.append(TripResponse(
            id=str(trip.id),
            user_id=str(trip.user_id),
            title=trip.title,
            description=trip.description,
            budget=float(trip.budget) if trip.budget else None,
            start_date=trip.start_date,
            end_date=trip.end_date,
            status=trip.status,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
            participants=participants_data
        ))
    
    return result

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific trip by ID."""
    try:
        trip_uuid = UUIDType(trip_id)
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
    participant = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.user_id == (UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id)
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this trip"
        )
    
    # Get participants
    trip_participants = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid
    ).all()
    
    participants_data = []
    for participant in trip_participants:
        user = db.query(User).filter(User.id == participant.user_id).first()
        participants_data.append(TripParticipantResponse(
            id=str(participant.id),
            user_id=str(participant.user_id),
            role=participant.role,
            status=participant.status,
            invited_at=participant.invited_at,
            joined_at=participant.joined_at,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "avatar_url": user.avatar_url
            } if user else None
        ))
    
    return TripResponse(
        id=str(trip.id),
        user_id=str(trip.user_id),
        title=trip.title,
        description=trip.description,
        budget=float(trip.budget) if trip.budget else None,
        start_date=trip.start_date,
        end_date=trip.end_date,
        status=trip.status,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        participants=participants_data
    )

@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    trip_update: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a trip (only creator can update)."""
    try:
        trip_uuid = UUIDType(trip_id)
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
    
    # Check if user is the creator
    trip_user_id = str(trip.user_id) if trip.user_id else None
    current_user_id = str(current_user.id) if current_user.id else None
    if trip_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can update the trip"
        )
    
    # Update fields
    if trip_update.title is not None:
        trip.title = trip_update.title
    if trip_update.description is not None:
        trip.description = trip_update.description
    if trip_update.budget is not None:
        trip.budget = trip_update.budget
    if trip_update.start_date is not None:
        trip.start_date = trip_update.start_date
    if trip_update.end_date is not None:
        trip.end_date = trip_update.end_date
    if trip_update.status is not None:
        trip.status = trip_update.status
    
    db.commit()
    db.refresh(trip)
    
    # Get participants
    trip_participants = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid
    ).all()
    
    participants_data = []
    for participant in trip_participants:
        user = db.query(User).filter(User.id == participant.user_id).first()
        participants_data.append(TripParticipantResponse(
            id=str(participant.id),
            user_id=str(participant.user_id),
            role=participant.role,
            status=participant.status,
            invited_at=participant.invited_at,
            joined_at=participant.joined_at,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "avatar_url": user.avatar_url
            } if user else None
        ))
    
    return TripResponse(
        id=str(trip.id),
        user_id=str(trip.user_id),
        title=trip.title,
        description=trip.description,
        budget=float(trip.budget) if trip.budget else None,
        start_date=trip.start_date,
        end_date=trip.end_date,
        status=trip.status,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        participants=participants_data
    )

@router.post("/{trip_id}/invite", response_model=List[TripParticipantResponse])
async def invite_users_to_trip(
    trip_id: str,
    invite_data: TripInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite users to a trip (only creator can invite)."""
    try:
        trip_uuid = UUIDType(trip_id)
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
    
    # Check if user is the creator
    trip_user_id = str(trip.user_id) if trip.user_id else None
    current_user_id = str(current_user.id) if current_user.id else None
    if trip_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can invite users"
        )
    
    new_participants = []
    for user_id in invite_data.user_ids:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue
        
        # Check if user is connected (accepted connection)
        connection = db.query(UserConnection).filter(
            or_(
                and_(
                    UserConnection.user_id == str(current_user.id),
                    UserConnection.connected_user_id == user_id,
                    UserConnection.status == ConnectionStatus.ACCEPTED.value
                ),
                and_(
                    UserConnection.user_id == user_id,
                    UserConnection.connected_user_id == str(current_user.id),
                    UserConnection.status == ConnectionStatus.ACCEPTED.value
                )
            )
        ).first()
        
        if not connection:
            continue  # Skip users who are not connected
        
        # Check if already a participant
        existing = db.query(TripParticipant).filter(
            TripParticipant.trip_id == trip_uuid,
            TripParticipant.user_id == user_id
        ).first()
        
        if existing:
            continue  # Skip if already invited
        
        # Create participant
        participant = TripParticipant(
            trip_id=trip_uuid,
            user_id=UUIDType(user_id) if isinstance(user_id, str) else user_id,
            role="member",
            status="pending"
        )
        db.add(participant)
        new_participants.append(participant)
    
    db.commit()
    
    # Return all participants
    all_participants = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid
    ).all()
    
    result = []
    for participant in all_participants:
        user = db.query(User).filter(User.id == participant.user_id).first()
        result.append(TripParticipantResponse(
            id=str(participant.id),
            user_id=str(participant.user_id),
            role=participant.role,
            status=participant.status,
            invited_at=participant.invited_at,
            joined_at=participant.joined_at,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "avatar_url": user.avatar_url
            } if user else None
        ))
    
    return result

@router.put("/{trip_id}/participants/{participant_id}", response_model=TripParticipantResponse)
async def update_participant_status(
    trip_id: str,
    participant_id: str,
    update_data: TripParticipantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept or decline a trip invitation."""
    try:
        trip_uuid = UUIDType(trip_id)
        participant_uuid = UUIDType(participant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip ID or participant ID format"
        )
    
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participant = db.query(TripParticipant).filter(
        TripParticipant.id == participant_uuid,
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.user_id == user_uuid
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    if update_data.status not in ["accepted", "declined"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'accepted' or 'declined'"
        )
    
    participant.status = update_data.status
    if update_data.status == "accepted":
        participant.joined_at = datetime.utcnow()
    
    db.commit()
    db.refresh(participant)
    
    user = db.query(User).filter(User.id == participant.user_id).first()
    return TripParticipantResponse(
        id=str(participant.id),
        user_id=str(participant.user_id),
        role=participant.role,
        status=participant.status,
        invited_at=participant.invited_at,
        joined_at=participant.joined_at,
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "avatar_url": user.avatar_url
        } if user else None
    )

@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a trip (only creator can delete)."""
    try:
        trip_uuid = UUIDType(trip_id)
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
    
    # Check if user is the creator
    trip_user_id = str(trip.user_id) if trip.user_id else None
    current_user_id = str(current_user.id) if current_user.id else None
    if trip_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can delete the trip"
        )
    
    db.delete(trip)
    db.commit()
    
    return {"message": "Trip deleted successfully"}

@router.delete("/{trip_id}/participants/{participant_id}")
async def remove_participant(
    trip_id: str,
    participant_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from a trip (only creator can remove participants)."""
    try:
        trip_uuid = UUIDType(trip_id)
        participant_uuid = UUIDType(participant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip ID or participant ID format"
        )
    
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user is the creator
    trip_user_id = str(trip.user_id) if trip.user_id else None
    current_user_id = str(current_user.id) if current_user.id else None
    if trip_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can remove participants"
        )
    
    participant = db.query(TripParticipant).filter(
        TripParticipant.id == participant_uuid,
        TripParticipant.trip_id == trip_uuid
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    # Prevent removing the creator
    if participant.role == "creator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the trip creator"
        )
    
    db.delete(participant)
    db.commit()
    
    return {"message": "Participant removed successfully"}

