from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.user import User
from app.models.connection import UserConnection, ConnectionStatus
from app.schemas.connection import (
    ConnectionCreate, 
    ConnectionResponse, 
    ConnectionUpdate,
    ConnectionWithUser,
    UserSearchResponse
)
from app.controllers.auth import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("/search", response_model=List[UserSearchResponse])
async def search_users(
    query: str = Query(..., min_length=1, description="Search by email, first name, or last name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for users by email, first name, or last name."""
    if not query:
        return []
    
    # Search users (excluding current user)
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.email.ilike(f"%{query}%"),
            User.first_name.ilike(f"%{query}%"),
            User.last_name.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    result = []
    for user in users:
        # Check if there's an existing connection
        connection = db.query(UserConnection).filter(
            or_(
                and_(
                    UserConnection.user_id == current_user.id,
                    UserConnection.connected_user_id == user.id
                ),
                and_(
                    UserConnection.user_id == user.id,
                    UserConnection.connected_user_id == current_user.id
                )
            )
        ).first()
        
        # Convert string status to enum if connection exists
        connection_status = None
        if connection and connection.status:
            try:
                connection_status = ConnectionStatus(connection.status)
            except ValueError:
                connection_status = None
        
        result.append(UserSearchResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            avatar_url=user.avatar_url,
            connection_status=connection_status
        ))
    
    return result

@router.post("/request", response_model=ConnectionResponse)
async def send_connection_request(
    connection_data: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a connection request to another user."""
    # Check if user is trying to connect to themselves
    if connection_data.connected_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect to yourself"
        )
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == connection_data.connected_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if connection already exists
    existing_connection = db.query(UserConnection).filter(
        or_(
            and_(
                UserConnection.user_id == current_user.id,
                UserConnection.connected_user_id == connection_data.connected_user_id
            ),
            and_(
                UserConnection.user_id == connection_data.connected_user_id,
                UserConnection.connected_user_id == current_user.id
            )
        )
    ).first()
    
    if existing_connection:
        if existing_connection.status == ConnectionStatus.BLOCKED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Connection is blocked"
            )
        # Return existing connection - convert string status back to enum for response
        status_enum = ConnectionStatus(existing_connection.status) if existing_connection.status else ConnectionStatus.PENDING
        return ConnectionResponse(
            id=str(existing_connection.id),
            user_id=str(existing_connection.user_id),
            connected_user_id=str(existing_connection.connected_user_id),
            status=status_enum,
            created_at=existing_connection.created_at,
            updated_at=existing_connection.updated_at
        )
    
    # Create new connection request
    new_connection = UserConnection(
        user_id=current_user.id,
        connected_user_id=connection_data.connected_user_id,
        status=ConnectionStatus.PENDING.value  # Use .value to get the string
    )
    
    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)
    
    # Convert string status back to enum for response
    status_enum = ConnectionStatus(new_connection.status) if new_connection.status else ConnectionStatus.PENDING
    return ConnectionResponse(
        id=str(new_connection.id),
        user_id=str(new_connection.user_id),
        connected_user_id=str(new_connection.connected_user_id),
        status=status_enum,
        created_at=new_connection.created_at,
        updated_at=new_connection.updated_at
    )

@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: str,
    connection_update: ConnectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept, reject, or block a connection request."""
    connection = db.query(UserConnection).filter(
        UserConnection.id == connection_id
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Check if current user is involved in this connection
    if connection.user_id != current_user.id and connection.connected_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this connection"
        )
    
    # Only the receiver can accept a pending request
    if connection_update.status == ConnectionStatus.ACCEPTED:
        if connection.status != ConnectionStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only accept pending requests"
            )
        if connection.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot accept your own request"
            )
    
    connection.status = connection_update.status.value  # Convert enum to string
    db.commit()
    db.refresh(connection)
    
    # Convert string status back to enum for response
    status_enum = ConnectionStatus(connection.status) if connection.status else ConnectionStatus.PENDING
    return ConnectionResponse(
        id=str(connection.id),
        user_id=str(connection.user_id),
        connected_user_id=str(connection.connected_user_id),
        status=status_enum,
        created_at=connection.created_at,
        updated_at=connection.updated_at
    )

@router.get("/", response_model=List[ConnectionWithUser])
async def get_connections(
    status_filter: Optional[ConnectionStatus] = Query(None, description="Filter by connection status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all connections for the current user."""
    query = db.query(UserConnection).filter(
        or_(
            UserConnection.user_id == current_user.id,
            UserConnection.connected_user_id == current_user.id
        )
    )
    
    if status_filter:
        # Convert enum to string for database query
        filter_value = status_filter.value if isinstance(status_filter, ConnectionStatus) else status_filter
        query = query.filter(UserConnection.status == filter_value)
    
    connections = query.all()
    
    result = []
    for conn in connections:
        # Determine which user is the "other" user
        if conn.user_id == current_user.id:
            other_user_id = conn.connected_user_id
        else:
            other_user_id = conn.user_id
        
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Convert string status to enum
        status_enum = ConnectionStatus(conn.status) if conn.status else ConnectionStatus.PENDING
        
        result.append(ConnectionWithUser(
            id=str(conn.id),
            user_id=str(conn.user_id),
            connected_user_id=str(conn.connected_user_id),
            status=status_enum,
            created_at=conn.created_at,
            updated_at=conn.updated_at,
            connected_user={
                "id": str(other_user.id),
                "email": other_user.email,
                "first_name": other_user.first_name,
                "last_name": other_user.last_name,
                "phone": other_user.phone,
                "avatar_url": other_user.avatar_url
            } if other_user else None
        ))
    
    return result

@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a connection."""
    connection = db.query(UserConnection).filter(
        UserConnection.id == connection_id
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Check if current user is involved in this connection
    if connection.user_id != current_user.id and connection.connected_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this connection"
        )
    
    db.delete(connection)
    db.commit()
    
    return {"message": "Connection deleted successfully"}

