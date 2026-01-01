from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(6), nullable=False, index=True)  # 6-digit verification code
    is_used = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    user = relationship("User", backref="verification_tokens")
    
    def __repr__(self):
        return f"<VerificationToken(id={self.id}, user_id={self.user_id}, code='{self.code}', is_used={self.is_used})>"
    
    def is_expired(self):
        """Check if token is expired"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at




