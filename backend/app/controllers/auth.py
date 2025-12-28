from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
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
    # Check if username already exists (case-insensitive)
    existing_username = db.query(User).filter(func.lower(User.username) == func.lower(user_data.username)).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken. Please choose a different username."
        )
    
    # Check if user already exists (case-insensitive email comparison)
    existing_user = db.query(User).filter(func.lower(User.email) == func.lower(user_data.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username.lower(),  # Store username in lowercase for consistency
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
        username=db_user.username,
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
    """Authenticate user and return access token. Accepts either email or username."""
    try:
        # Normalize input (lowercase for comparison)
        login_input = user_credentials.username_or_email.lower().strip()
        
        # Try to find user by email first, then by username
        # Check if input contains @ (likely an email)
        if '@' in login_input:
            # Find user by email (case-insensitive email comparison)
            user = db.query(User).filter(func.lower(User.email) == login_input).first()
        else:
            # Find user by username (case-insensitive username comparison)
            user = db.query(User).filter(func.lower(User.username) == login_input).first()
        
        # If not found, try the other method as fallback
        if not user:
            if '@' in login_input:
                # Already tried email, try username
                user = db.query(User).filter(func.lower(User.username) == login_input).first()
            else:
                # Already tried username, try email
                user = db.query(User).filter(func.lower(User.email) == login_input).first()
        
        if not user:
            print(f"Login attempt failed: User with username/email '{user_credentials.username_or_email}' not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user_not_registered"
            )
        
        # Verify password
        if not verify_password(user_credentials.password, user.password_hash):
            print(f"Login attempt failed: Incorrect password for user '{user_credentials.username_or_email}'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password"
            )
        
        # Check if user is active or pending verification (allow pending_verification for development)
        if user.status not in ['active', 'pending_verification']:
            print(f"Login attempt failed: User '{user_credentials.username_or_email}' is not active (status: {user.status})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"User account is not active. Current status: {user.status}"
            )
        
        print(f"Login successful for user '{user_credentials.username_or_email}' (ID: {user.id})")
        
        # Generate access token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # Convert user to response format
        user_response = UserResponse(
            id=str(user.id),  # Convert UUID to string
            username=user.username,
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
    except HTTPException:
        # Re-raise HTTP exceptions (401, 400, etc.)
        raise
    except Exception as e:
        # Log unexpected errors
        import traceback
        error_trace = traceback.format_exc()
        print(f"Unexpected error during login: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
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
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        is_verified=current_user.is_verified,
        status=current_user.status,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )
