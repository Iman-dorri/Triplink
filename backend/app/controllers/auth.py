from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenWithUser
from app.utils.auth import get_password_hash, verify_password, create_access_token, verify_token
from typing import Optional
import os

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", response_model=TokenWithUser)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": str(db_user.id), "email": db_user.email}
    )
    
    # Convert user to response format
    user_response = UserResponse(
        id=str(db_user.id),  # Convert UUID to string
        email=db_user.email,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        phone=db_user.phone,
        is_verified=db_user.is_verified,
        status=db_user.status,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at
    )
    
    return TokenWithUser(
        access_token=access_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
        user=user_response
    )

@router.post("/login", response_model=TokenWithUser)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    # Find user by email
    user = db.query(User).filter(User.email == user_credentials.email).first()
    if not user:
        print(f"Login attempt failed: User with email {user_credentials.email} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user.password_hash):
        print(f"Login attempt failed: Incorrect password for user {user_credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if user.status != 'active':
        print(f"Login attempt failed: User {user_credentials.email} is not active (status: {user.status})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User account is not active. Current status: {user.status}"
        )
    
    print(f"Login successful for user {user_credentials.email}")
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    # Convert user to response format
    user_response = UserResponse(
        id=str(user.id),  # Convert UUID to string
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_verified=user.is_verified,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return TokenWithUser(
        access_token=access_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
        user=user_response
    )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        is_verified=current_user.is_verified,
        status=current_user.status,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )
