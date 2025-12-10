from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
import enum

class ConnectionStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"

class UserConnection(Base):
    __tablename__ = "user_connections"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    connected_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    # Use String instead of Enum to match existing database schema
    status = Column(String(20), default=ConnectionStatus.PENDING.value, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="connections")
    connected_user = relationship("User", foreign_keys=[connected_user_id], back_populates="connected_to")
    
    def __repr__(self):
        return f"<UserConnection(id={self.id}, user_id={self.user_id}, connected_user_id={self.connected_user_id}, status={self.status})>"

