from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app.models.user import User
from app.models.trip import Trip, TripParticipant
from app.models.expense import Expense, ExpenseSplit, ExpenseAuditLog, Settlement, SettlementExpense
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseSplitResponse,
    SettlementCreate,
    SettlementResponse
)
from app.controllers.auth import get_current_user
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID as UUIDType
from decimal import Decimal
from app.utils.money import parse_money_to_cents
from sqlalchemy.exc import IntegrityError

def format_cents_to_string(cents: int) -> str:
    """Format integer cents to string with exactly 2 decimal places. Uses integer math, no floats."""
    sign = "-" if cents < 0 else ""
    abs_cents = abs(cents)
    whole = abs_cents // 100
    frac = abs_cents % 100
    return f"{sign}{whole}.{frac:02d}"

router = APIRouter(prefix="/expenses", tags=["expenses"])

def get_trip_participant(trip_id: UUIDType, user_id: UUIDType, db: Session) -> Optional[TripParticipant]:
    """Get trip participant record for a user."""
    return db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_id,
        TripParticipant.user_id == user_id,
        TripParticipant.status == 'accepted'
    ).first()

def is_trip_owner(trip: Trip, user_id: UUIDType) -> bool:
    """Check if user is the trip owner."""
    return str(trip.user_id) == str(user_id)

def can_edit_expense(expense: Expense, user: User, trip: Trip) -> bool:
    """Check if user can edit an expense."""
    if expense.is_locked:
        return False
    if expense.status != 'ACTIVE':
        return False
    user_uuid = UUIDType(user.id) if isinstance(user.id, str) else user.id
    # Creator can always edit (if not locked)
    if str(expense.created_by_user_id) == str(user_uuid):
        return True
    # Trip owner can edit any expense
    if is_trip_owner(trip, user_uuid):
        return True
    return False

def can_void_expense(expense: Expense, user: User, trip: Trip) -> bool:
    """Check if user can void an expense."""
    if expense.is_locked:
        return False
    if expense.status != 'ACTIVE':
        return False
    user_uuid = UUIDType(user.id) if isinstance(user.id, str) else user.id
    # Check if within 15 minutes of creation (creator can void)
    # Handle timezone-aware datetime
    expense_created = expense.created_at
    if expense_created.tzinfo is not None:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        time_since_creation = now - expense_created
    else:
        now = datetime.utcnow()
        time_since_creation = now - expense_created
    if time_since_creation <= timedelta(minutes=15):
        if str(expense.created_by_user_id) == str(user_uuid):
            return True
    # Trip owner can void anytime (if not locked)
    if is_trip_owner(trip, user_uuid):
        return True
    return False

def calculate_equal_split(amount_cents: int, num_participants: int, payer_index: int) -> List[int]:
    """
    Calculate equal split in cents.
    Returns list of share_cents for each participant.
    Remainder goes to the payer at payer_index, regardless of participant ordering.
    
    Args:
        amount_cents: Total amount in cents
        num_participants: Number of participants
        payer_index: Index of the payer in the participant list (0-based)
    
    Returns:
        List of share_cents for each participant
    """
    if num_participants == 0:
        return []
    
    if payer_index < 0 or payer_index >= num_participants:
        raise ValueError(f"payer_index {payer_index} is out of range for {num_participants} participants")
    
    # Calculate base share per participant (in cents)
    base_share_cents = amount_cents // num_participants
    remainder_cents = amount_cents % num_participants
    
    # All participants get base share
    shares = [base_share_cents] * num_participants
    
    # Add remainder to payer (at payer_index, not necessarily first)
    if remainder_cents > 0:
        shares[payer_index] += remainder_cents
    
    return shares

def create_audit_log(
    db: Session,
    expense_id: UUIDType,
    actor_user_id: UUIDType,
    action: str,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    reason: Optional[str] = None
):
    """Create an audit log entry."""
    audit_log = ExpenseAuditLog(
        expense_id=expense_id,
        actor_user_id=actor_user_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        reason=reason
    )
    db.add(audit_log)
    return audit_log

@router.post("/trips/{trip_id}/expenses", response_model=ExpenseResponse)
async def create_expense(
    trip_id: str,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new expense for a trip (equal split only)."""
    try:
        trip_uuid = UUIDType(trip_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid trip ID")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check if user is an accepted participant OR the trip creator
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    is_owner = is_trip_owner(trip, user_uuid)
    
    # If user is owner, they can always create expenses
    if is_owner:
        # Owner can create expenses - proceed
        pass
    else:
        # For non-owners, must be accepted participant
        participant = get_trip_participant(trip_uuid, user_uuid, db)
        if not participant:
            # Check if user is a participant with different status (for better error message)
            any_participant = db.query(TripParticipant).filter(
                TripParticipant.trip_id == trip_uuid,
                TripParticipant.user_id == user_uuid
            ).first()
            if any_participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail=f"You must be an accepted participant to create expenses. Your current status: {any_participant.status}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="You must be an accepted participant or trip creator to create expenses"
                )
    
    # Check currency lock (if this is the first expense, currency is locked)
    # This check is informational - we'll enforce it in trip update endpoint
    
    # Validate payer is a participant
    try:
        payer_uuid = UUIDType(expense_data.payer_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payer user ID")
    
    payer_participant = get_trip_participant(trip_uuid, payer_uuid, db)
    if not payer_participant:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payer must be an accepted trip participant")
    
    # Validate all participants are accepted participants
    participant_uuids = []
    for user_id_str in expense_data.participant_user_ids:
        try:
            user_id_uuid = UUIDType(user_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid participant user ID: {user_id_str}")
        
        part = get_trip_participant(trip_uuid, user_id_uuid, db)
        if not part:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {user_id_str} is not an accepted participant")
        participant_uuids.append(user_id_uuid)
    
    # Validate payer is in participant list
    if payer_uuid not in participant_uuids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="payer_user_id must be included in participant_user_ids"
        )
    
    # Find payer index in participant list
    payer_index = participant_uuids.index(payer_uuid)
    
    # Convert amount string to cents (already validated by schema)
    cents, error = parse_money_to_cents(expense_data.amount)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid amount: {error}")
    amount_cents = cents
    
    # Calculate equal splits (remainder goes to payer at payer_index)
    num_participants = len(participant_uuids)
    share_cents_list = calculate_equal_split(amount_cents, num_participants, payer_index)
    
    # Verify sum equals total
    total_shares = sum(share_cents_list)
    if total_shares != amount_cents:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Split calculation error: shares don't sum to total")
    
    # Create expense
    adjusts_expense_uuid = None
    if expense_data.adjusts_expense_id:
        try:
            adjusts_expense_uuid = UUIDType(expense_data.adjusts_expense_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjusts_expense_id")
    
    expense = Expense(
        trip_id=trip_uuid,
        created_by_user_id=user_uuid,
        payer_user_id=payer_uuid,
        amount_cents=amount_cents,
        description=expense_data.description,
        type=expense_data.type,
        adjusts_expense_id=adjusts_expense_uuid,
        status='ACTIVE',
        is_locked=False
    )
    db.add(expense)
    db.flush()  # Get expense.id
    
    # Create splits (upsert to handle unique constraint)
    for i, participant_uuid in enumerate(participant_uuids):
        # Check if split already exists (shouldn't for new expense, but handle gracefully)
        existing_split = db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == expense.id,
            ExpenseSplit.user_id == participant_uuid
        ).first()
        
        if existing_split:
            # Update existing split
            existing_split.share_cents = share_cents_list[i]
        else:
            # Create new split
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=participant_uuid,
                share_cents=share_cents_list[i]
            )
            db.add(split)
    
    # Create audit log
    create_audit_log(
        db=db,
        expense_id=expense.id,
        actor_user_id=user_uuid,
        action='EXPENSE_CREATED',
        new_values={
            'amount_cents': amount_cents,
            'description': expense_data.description,
            'payer_user_id': str(payer_uuid),
            'participant_user_ids': [str(u) for u in participant_uuids]
        }
    )
    
    db.commit()
    db.refresh(expense)
    
    # Load relationships
    expense.splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
    
    # Build response
    splits_response = []
    for split in expense.splits:
        split_user = db.query(User).filter(User.id == split.user_id).first()
        splits_response.append(ExpenseSplitResponse(
            id=str(split.id),
            user_id=str(split.user_id),
            share=format_cents_to_string(split.share_cents),
            share_cents=split.share_cents,
            user={
                "id": str(split_user.id),
                "username": split_user.username,
                "first_name": split_user.first_name,
                "last_name": split_user.last_name
            } if split_user else None
        ))
    
    creator = db.query(User).filter(User.id == expense.created_by_user_id).first()
    payer = db.query(User).filter(User.id == expense.payer_user_id).first()
    
    return ExpenseResponse(
        id=str(expense.id),
        trip_id=str(expense.trip_id),
        created_by_user_id=str(expense.created_by_user_id),
        payer_user_id=str(expense.payer_user_id),
        amount=format_cents_to_string(expense.amount_cents),
        amount_cents=expense.amount_cents,
        description=expense.description,
        type=expense.type,
        adjusts_expense_id=str(expense.adjusts_expense_id) if expense.adjusts_expense_id else None,
        status=expense.status,
        voided_at=expense.voided_at,
        voided_by_user_id=str(expense.voided_by_user_id) if expense.voided_by_user_id else None,
        is_locked=expense.is_locked,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        splits=splits_response,
        creator={
            "id": str(creator.id),
            "username": creator.username,
            "first_name": creator.first_name,
            "last_name": creator.last_name
        } if creator else None,
        payer={
            "id": str(payer.id),
            "username": payer.username,
            "first_name": payer.first_name,
            "last_name": payer.last_name
        } if payer else None
    )

@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an expense (only creator or trip owner, if not locked)."""
    try:
        expense_uuid = UUIDType(expense_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID")
    
    # Get expense
    expense = db.query(Expense).filter(Expense.id == expense_uuid).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == expense.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check permissions
    if not can_edit_expense(expense, current_user, trip):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to edit this expense")
    
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Get old splits for audit log (before any updates)
    old_splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
    old_participant_ids = [str(split.user_id) for split in old_splits]
    
    # Store old values for audit log
    old_values = {
        'amount_cents': expense.amount_cents,
        'description': expense.description,
        'payer_user_id': str(expense.payer_user_id),
        'participant_user_ids': old_participant_ids
    }
    
    # Update fields - only update if provided (not None)
    if expense_update.amount is not None:
        # Convert amount string to cents (already validated by schema)
        cents, error = parse_money_to_cents(expense_update.amount)
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid amount: {error}")
        expense.amount_cents = cents
    
    if expense_update.description is not None:
        expense.description = expense_update.description
    if expense_update.payer_user_id is not None:
        try:
            new_payer_uuid = UUIDType(expense_update.payer_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payer user ID")
        
        # Validate payer is a participant
        payer_participant = get_trip_participant(expense.trip_id, new_payer_uuid, db)
        if not payer_participant:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payer must be an accepted trip participant")
        
        expense.payer_user_id = new_payer_uuid
    
    # If participants changed, recalculate splits
    if expense_update.participant_user_ids is not None:
        # Validate all participants
        participant_uuids = []
        for user_id_str in expense_update.participant_user_ids:
            try:
                user_id_uuid = UUIDType(user_id_str)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid participant user ID: {user_id_str}")
            
            part = get_trip_participant(expense.trip_id, user_id_uuid, db)
            if not part:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {user_id_str} is not an accepted participant")
            participant_uuids.append(user_id_uuid)
        
        # Validate payer is in participant list
        if expense.payer_user_id not in participant_uuids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="payer_user_id must be included in participant_user_ids"
            )
        
        # Find payer index in participant list
        payer_index = participant_uuids.index(expense.payer_user_id)
        
        # Calculate new splits (remainder goes to payer at payer_index)
        num_participants = len(participant_uuids)
        share_cents_list = calculate_equal_split(expense.amount_cents, num_participants, payer_index)
        
        # Get existing splits to update/delete
        existing_splits = db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == expense.id
        ).all()
        existing_split_map = {str(split.user_id): split for split in existing_splits}
        
        # Update or create splits (handle unique constraint)
        for i, participant_uuid in enumerate(participant_uuids):
            participant_uuid_str = str(participant_uuid)
            if participant_uuid_str in existing_split_map:
                # Update existing split
                existing_split_map[participant_uuid_str].share_cents = share_cents_list[i]
            else:
                # Create new split
                split = ExpenseSplit(
                    expense_id=expense.id,
                    user_id=participant_uuid,
                    share_cents=share_cents_list[i]
                )
                db.add(split)
        
        # Delete splits for participants no longer in the list
        participant_uuid_set = {str(u) for u in participant_uuids}
        for user_id_str, split in existing_split_map.items():
            if user_id_str not in participant_uuid_set:
                db.delete(split)
    
    expense.updated_at = datetime.utcnow()
    
    # Create audit log
    new_values = {
        'amount_cents': expense.amount_cents,
        'description': expense.description,
        'payer_user_id': str(expense.payer_user_id)
    }
    if expense_update.participant_user_ids is not None:
        new_values['participant_user_ids'] = [str(u) for u in participant_uuids]
    
    create_audit_log(
        db=db,
        expense_id=expense.id,
        actor_user_id=user_uuid,
        action='EXPENSE_EDITED',
        old_values=old_values,
        new_values=new_values,
        reason=expense_update.reason
    )
    
    db.commit()
    db.refresh(expense)
    
    # Load relationships
    expense.splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
    
    # Build response (same as create)
    splits_response = []
    for split in expense.splits:
        split_user = db.query(User).filter(User.id == split.user_id).first()
        splits_response.append(ExpenseSplitResponse(
            id=str(split.id),
            user_id=str(split.user_id),
            share=format_cents_to_string(split.share_cents),
            share_cents=split.share_cents,
            user={
                "id": str(split_user.id),
                "username": split_user.username,
                "first_name": split_user.first_name,
                "last_name": split_user.last_name
            } if split_user else None
        ))
    
    creator = db.query(User).filter(User.id == expense.created_by_user_id).first()
    payer = db.query(User).filter(User.id == expense.payer_user_id).first()
    
    return ExpenseResponse(
        id=str(expense.id),
        trip_id=str(expense.trip_id),
        created_by_user_id=str(expense.created_by_user_id),
        payer_user_id=str(expense.payer_user_id),
        amount=format_cents_to_string(expense.amount_cents),
        amount_cents=expense.amount_cents,
        description=expense.description,
        type=expense.type,
        adjusts_expense_id=str(expense.adjusts_expense_id) if expense.adjusts_expense_id else None,
        status=expense.status,
        voided_at=expense.voided_at,
        voided_by_user_id=str(expense.voided_by_user_id) if expense.voided_by_user_id else None,
        is_locked=expense.is_locked,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        splits=splits_response,
        creator={
            "id": str(creator.id),
            "username": creator.username,
            "first_name": creator.first_name,
            "last_name": creator.last_name
        } if creator else None,
        payer={
            "id": str(payer.id),
            "username": payer.username,
            "first_name": payer.first_name,
            "last_name": payer.last_name
        } if payer else None
    )

@router.post("/{expense_id}/void", response_model=ExpenseResponse)
async def void_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Void an expense (creator within 15 min, or trip owner anytime, if not locked)."""
    try:
        expense_uuid = UUIDType(expense_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID")
    
    # Get expense
    expense = db.query(Expense).filter(Expense.id == expense_uuid).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == expense.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check permissions
    if not can_void_expense(expense, current_user, trip):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to void this expense")
    
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Store old values for audit log
    old_values = {
        'status': expense.status
    }
    
    # Void the expense
    expense.status = 'VOID'
    expense.voided_at = datetime.utcnow()
    expense.voided_by_user_id = user_uuid
    expense.updated_at = datetime.utcnow()
    
    # Create audit log
    create_audit_log(
        db=db,
        expense_id=expense.id,
        actor_user_id=user_uuid,
        action='EXPENSE_VOIDED',
        old_values=old_values,
        new_values={'status': 'VOID'}
    )
    
    db.commit()
    db.refresh(expense)
    
    # Build response (same as create)
    expense.splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
    
    splits_response = []
    for split in expense.splits:
        split_user = db.query(User).filter(User.id == split.user_id).first()
        splits_response.append(ExpenseSplitResponse(
            id=str(split.id),
            user_id=str(split.user_id),
            share=format_cents_to_string(split.share_cents),
            share_cents=split.share_cents,
            user={
                "id": str(split_user.id),
                "username": split_user.username,
                "first_name": split_user.first_name,
                "last_name": split_user.last_name
            } if split_user else None
        ))
    
    creator = db.query(User).filter(User.id == expense.created_by_user_id).first()
    payer = db.query(User).filter(User.id == expense.payer_user_id).first()
    
    return ExpenseResponse(
        id=str(expense.id),
        trip_id=str(expense.trip_id),
        created_by_user_id=str(expense.created_by_user_id),
        payer_user_id=str(expense.payer_user_id),
        amount=format_cents_to_string(expense.amount_cents),
        amount_cents=expense.amount_cents,
        description=expense.description,
        type=expense.type,
        adjusts_expense_id=str(expense.adjusts_expense_id) if expense.adjusts_expense_id else None,
        status=expense.status,
        voided_at=expense.voided_at,
        voided_by_user_id=str(expense.voided_by_user_id) if expense.voided_by_user_id else None,
        is_locked=expense.is_locked,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        splits=splits_response,
        creator={
            "id": str(creator.id),
            "username": creator.username,
            "first_name": creator.first_name,
            "last_name": creator.last_name
        } if creator else None,
        payer={
            "id": str(payer.id),
            "username": payer.username,
            "first_name": payer.first_name,
            "last_name": payer.last_name
        } if payer else None
    )

@router.get("/trips/{trip_id}/expenses", response_model=List[ExpenseResponse])
async def get_trip_expenses(
    trip_id: str,
    include_void: bool = Query(default=False, description="Include voided expenses"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all expenses for a trip (default: active only)."""
    try:
        trip_uuid = UUIDType(trip_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid trip ID")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check if user is a participant
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participant = db.query(TripParticipant).filter(
        TripParticipant.trip_id == trip_uuid,
        TripParticipant.user_id == user_uuid
    ).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a trip participant to view expenses")
    
    # Query expenses
    query = db.query(Expense).filter(Expense.trip_id == trip_uuid)
    if not include_void:
        query = query.filter(Expense.status == 'ACTIVE')
    
    expenses = query.order_by(Expense.created_at.desc()).all()
    
    # Build response
    result = []
    for expense in expenses:
        expense.splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
        
        splits_response = []
        for split in expense.splits:
            split_user = db.query(User).filter(User.id == split.user_id).first()
            splits_response.append(ExpenseSplitResponse(
                id=str(split.id),
                user_id=str(split.user_id),
                share=format_cents_to_string(split.share_cents),
                share_cents=split.share_cents,
                user={
                    "id": str(split_user.id),
                    "username": split_user.username,
                    "first_name": split_user.first_name,
                    "last_name": split_user.last_name
                } if split_user else None
            ))
        
        creator = db.query(User).filter(User.id == expense.created_by_user_id).first()
        payer = db.query(User).filter(User.id == expense.payer_user_id).first()
        
        result.append(ExpenseResponse(
            id=str(expense.id),
            trip_id=str(expense.trip_id),
            created_by_user_id=str(expense.created_by_user_id),
            payer_user_id=str(expense.payer_user_id),
            amount=format_cents_to_string(expense.amount_cents),
            amount_cents=expense.amount_cents,
            description=expense.description,
            type=expense.type,
            adjusts_expense_id=str(expense.adjusts_expense_id) if expense.adjusts_expense_id else None,
            status=expense.status,
            voided_at=expense.voided_at,
            voided_by_user_id=str(expense.voided_by_user_id) if expense.voided_by_user_id else None,
            is_locked=expense.is_locked,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
            splits=splits_response,
            creator={
                "id": str(creator.id),
                "username": creator.username,
                "first_name": creator.first_name,
                "last_name": creator.last_name
            } if creator else None,
            payer={
                "id": str(payer.id),
                "username": payer.username,
                "first_name": payer.first_name,
                "last_name": payer.last_name
            } if payer else None
        ))
    
    return result

# Settlement endpoints
settlement_router = APIRouter(prefix="/settlements", tags=["settlements"])

@settlement_router.post("/", response_model=SettlementResponse)
async def create_settlement(
    settlement_data: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new settlement."""
    if not settlement_data.expense_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one expense ID is required")
    
    # Get first expense to determine trip
    try:
        first_expense_uuid = UUIDType(settlement_data.expense_ids[0])
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expense ID")
    
    first_expense = db.query(Expense).filter(Expense.id == first_expense_uuid).first()
    if not first_expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    trip_id = first_expense.trip_id
    
    # Validate all expenses belong to the same trip and are active
    expense_uuids = []
    for expense_id_str in settlement_data.expense_ids:
        try:
            expense_uuid = UUIDType(expense_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid expense ID: {expense_id_str}")
        
        expense = db.query(Expense).filter(Expense.id == expense_uuid).first()
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense {expense_id_str} not found")
        if expense.trip_id != trip_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All expenses must belong to the same trip")
        if expense.status != 'ACTIVE':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All expenses must be active")
        
        expense_uuids.append(expense_uuid)
    
    # Check if user is trip participant
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participant = get_trip_participant(trip_id, user_uuid, db)
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be an accepted participant to create settlements")
    
    # Create settlement
    settlement = Settlement(
        trip_id=trip_id,
        created_by_user_id=user_uuid,
        status='PENDING'
    )
    db.add(settlement)
    db.flush()
    
    # Link expenses
    for expense_uuid in expense_uuids:
        settlement_expense = SettlementExpense(
            settlement_id=settlement.id,
            expense_id=expense_uuid
        )
        db.add(settlement_expense)
    
    db.commit()
    db.refresh(settlement)
    
    return SettlementResponse(
        id=str(settlement.id),
        trip_id=str(settlement.trip_id),
        created_by_user_id=str(settlement.created_by_user_id),
        status=settlement.status,
        paid_at=settlement.paid_at,
        created_at=settlement.created_at,
        expense_ids=[str(eid) for eid in expense_uuids]
    )

@settlement_router.get("/trips/{trip_id}/settlements", response_model=List[SettlementResponse])
async def get_trip_settlements(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all settlements for a trip."""
    try:
        trip_uuid = UUIDType(trip_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid trip ID")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check if user is a participant
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    participant = get_trip_participant(trip_uuid, user_uuid, db)
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a trip participant to view settlements")
    
    # Query settlements
    settlements = db.query(Settlement).filter(
        Settlement.trip_id == trip_uuid
    ).order_by(Settlement.created_at.desc()).all()
    
    # Build response with expense IDs
    result = []
    for settlement in settlements:
        # Get linked expense IDs
        settlement_expenses = db.query(SettlementExpense).filter(
            SettlementExpense.settlement_id == settlement.id
        ).all()
        expense_ids = [str(se.expense_id) for se in settlement_expenses]
        
        result.append(SettlementResponse(
            id=str(settlement.id),
            trip_id=str(settlement.trip_id),
            created_by_user_id=str(settlement.created_by_user_id),
            status=settlement.status,
            paid_at=settlement.paid_at,
            created_at=settlement.created_at,
            expense_ids=expense_ids
        ))
    
    return result

@settlement_router.post("/{settlement_id}/mark-paid", response_model=SettlementResponse)
async def mark_settlement_paid(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a settlement as paid (locks all linked expenses)."""
    try:
        settlement_uuid = UUIDType(settlement_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid settlement ID")
    
    # Get settlement
    settlement = db.query(Settlement).filter(Settlement.id == settlement_uuid).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found")
    
    if settlement.status == 'PAID':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Settlement is already marked as paid")
    
    # Get trip
    trip = db.query(Trip).filter(Trip.id == settlement.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    
    # Check if user is trip owner (only owner can mark settlements as paid)
    user_uuid = UUIDType(current_user.id) if isinstance(current_user.id, str) else current_user.id
    if not is_trip_owner(trip, user_uuid):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the trip owner can mark settlements as paid")
    
    # Transactional block: mark paid + lock expenses (all or nothing)
    try:
        # Get all linked expenses first (validate they exist)
        settlement_expenses = db.query(SettlementExpense).filter(
            SettlementExpense.settlement_id == settlement.id
        ).all()
        
        if not settlement_expenses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Settlement has no linked expenses")
        
        expense_ids = []
        expenses_to_lock = []
        
        # Validate all expenses exist and are not already locked in incompatible way
        for se in settlement_expenses:
            expense = db.query(Expense).filter(Expense.id == se.expense_id).first()
            if not expense:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense {se.expense_id} not found")
            
            # Check if expense is already locked (shouldn't be, but validate)
            if expense.is_locked:
                # If already locked, check if it's in another PAID settlement
                other_settlement = db.query(SettlementExpense).join(Settlement).filter(
                    SettlementExpense.expense_id == expense.id,
                    Settlement.id != settlement.id,
                    Settlement.status == 'PAID'
                ).first()
                if other_settlement:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Expense {se.expense_id} is already locked in another paid settlement"
                    )
            
            expenses_to_lock.append(expense)
            expense_ids.append(str(expense.id))
        
        # All validations passed - perform atomic update
        # 1. Mark settlement as paid
        settlement.status = 'PAID'
        settlement.paid_at = datetime.utcnow()
        
        # 2. Lock all expenses
        for expense in expenses_to_lock:
            expense.is_locked = True
        
        # Commit transaction (all or nothing)
        db.commit()
        db.refresh(settlement)
        
    except HTTPException:
        # Re-raise HTTP exceptions
        db.rollback()
        raise
    except Exception as e:
        # Rollback on any other error
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark settlement as paid: {str(e)}"
        )
    
    return SettlementResponse(
        id=str(settlement.id),
        trip_id=str(settlement.trip_id),
        created_by_user_id=str(settlement.created_by_user_id),
        status=settlement.status,
        paid_at=settlement.paid_at,
        created_at=settlement.created_at,
        expense_ids=expense_ids
    )

