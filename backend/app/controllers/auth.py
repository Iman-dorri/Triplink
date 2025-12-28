from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app.models.user import User
from app.models.verification_token import VerificationToken
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, TokenWithUser,
    VerifyEmailRequest, ResendVerificationRequest, VerificationStatusResponse,
    ChangePasswordRequest
)
from app.utils.auth import get_password_hash, verify_password, create_access_token, verify_token
from app.utils.email import send_verification_email, send_password_change_email
from typing import Optional
from datetime import datetime, timedelta, timezone
import os
import random

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", response_model=TokenWithUser)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Validate tester code (required during development)
    expected_tester_code = os.getenv("TESTER_CODE", "")
    if not expected_tester_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tester code not configured. Registration is temporarily disabled."
        )
    
    if user_data.tester_code != expected_tester_code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid tester code. The application is currently in development. Please contact support to request a tester code."
        )
    
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
    
    # Generate 6-digit verification code
    verification_code = str(random.randint(100000, 999999))
    
    # Create verification token (expires in 60 minutes)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    verification_token = VerificationToken(
        user_id=db_user.id,
        code=verification_code,
        expires_at=expires_at
    )
    db.add(verification_token)
    db.commit()
    
    # Send verification email
    try:
        send_verification_email(
            email=db_user.email,
            name=f"{db_user.first_name} {db_user.last_name}",
            code=verification_code
        )
    except Exception as e:
        print(f"Warning: Failed to send verification email: {e}")
        # Continue with registration even if email fails
    
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
        
        # Check if user email is verified
        if not user.is_verified:
            print(f"Login attempt failed: User '{user_credentials.username_or_email}' email not verified")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="email_not_verified"
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

@router.post("/verify-email")
async def verify_email(
    verification_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Verify user's email address with verification code. Public endpoint (no auth required)."""
    try:
        # Find user by email
        user = db.query(User).filter(func.lower(User.email) == func.lower(verification_data.email)).first()
        
        if not user:
            # Don't reveal if email exists (security best practice)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        # Find the most recent unused verification token for this user
        verification_token = db.query(VerificationToken).filter(
            VerificationToken.user_id == user.id,
            VerificationToken.code == verification_data.code,
            VerificationToken.is_used == False
        ).order_by(VerificationToken.created_at.desc()).first()
        
        if not verification_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        # Check if token is expired
        if verification_token.is_expired():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one."
            )
        
        # Mark token as used
        verification_token.is_used = True
        verification_token.used_at = datetime.now(timezone.utc)
        
        # Update user verification status
        user.is_verified = True
        user.status = 'active'
        
        db.commit()
        
        return {
            "message": "Email verified successfully",
            "is_verified": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error verifying email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/resend-verification")
async def resend_verification(
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend verification code to user's email with rate limiting."""
    try:
        # Find user by email
        user = db.query(User).filter(func.lower(User.email) == func.lower(resend_data.email)).first()
        
        if not user:
            # Don't reveal if email exists or not (security best practice)
            return {
                "message": "If an account exists with this email, a verification code has been sent."
            }
        
        # Check if already verified
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )
        
        # Rate limiting: Check for recent verification tokens (within last 5 minutes)
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_tokens = db.query(VerificationToken).filter(
            VerificationToken.user_id == user.id,
            VerificationToken.created_at >= five_minutes_ago
        ).count()
        
        if recent_tokens > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait 5 minutes before requesting a new verification code"
            )
        
        # Invalidate all previous unused tokens for this user
        db.query(VerificationToken).filter(
            VerificationToken.user_id == user.id,
            VerificationToken.is_used == False
        ).update({"is_used": True})
        
        # Generate new 6-digit verification code
        verification_code = str(random.randint(100000, 999999))
        
        # Create new verification token (expires in 60 minutes)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
        verification_token = VerificationToken(
            user_id=user.id,
            code=verification_code,
            expires_at=expires_at
        )
        db.add(verification_token)
        db.commit()
        
        # Send verification email
        try:
            send_verification_email(
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                code=verification_code
            )
        except Exception as e:
            print(f"Warning: Failed to send verification email: {e}")
            # Still return success to avoid revealing email issues
        
        return {
            "message": "Verification code has been sent to your email"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error resending verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/verification-status")
async def get_verification_status(
    email: str,
    db: Session = Depends(get_db)
):
    """Get verification status and remaining time for a user's email."""
    try:
        # Find user by email
        user = db.query(User).filter(func.lower(User.email) == func.lower(email)).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Find the most recent unused verification token
        verification_token = db.query(VerificationToken).filter(
            VerificationToken.user_id == user.id,
            VerificationToken.is_used == False
        ).order_by(VerificationToken.created_at.desc()).first()
        
        code_expires_at = verification_token.expires_at if verification_token else None
        
        # Calculate account deletion time (2 hours after registration)
        account_deletion_at = user.created_at + timedelta(hours=2) if user.created_at else None
        
        # Calculate remaining times
        now = datetime.now(timezone.utc)
        time_remaining_seconds = None
        deletion_time_remaining_seconds = None
        
        if code_expires_at:
            time_remaining = (code_expires_at - now).total_seconds()
            time_remaining_seconds = max(0, int(time_remaining))
        
        if account_deletion_at:
            deletion_time_remaining = (account_deletion_at - now).total_seconds()
            deletion_time_remaining_seconds = max(0, int(deletion_time_remaining))
        
        return VerificationStatusResponse(
            email=user.email,
            is_verified=user.is_verified,
            code_expires_at=code_expires_at,
            account_deletion_at=account_deletion_at,
            time_remaining_seconds=time_remaining_seconds,
            deletion_time_remaining_seconds=deletion_time_remaining_seconds
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting verification status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    Requires current password verification and sends email notification.
    """
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Check if new password is different from current password
        if verify_password(password_data.new_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password"
            )
        
        # Hash new password
        new_password_hash = get_password_hash(password_data.new_password)
        
        # Update password
        current_user.password_hash = new_password_hash
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(current_user)
        
        # Send email notification
        user_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
        email_sent = send_password_change_email(
            email=current_user.email,
            name=user_name
        )
        
        if not email_sent:
            # Log warning but don't fail the request
            print(f"Warning: Failed to send password change email to {current_user.email}")
        
        return {
            "success": True,
            "message": "Password changed successfully. A confirmation email has been sent."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
