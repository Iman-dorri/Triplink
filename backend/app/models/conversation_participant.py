from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    other_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # For 1-on-1 chats
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True, index=True)  # For group chats
    cleared_at = Column(DateTime(timezone=True), nullable=True)  # When user cleared chat for themselves
    left_at = Column(DateTime(timezone=True), nullable=True)  # When user left group (only for group chats)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    other_user = relationship("User", foreign_keys=[other_user_id])
    trip = relationship("Trip")
    
    def __repr__(self):
        return f"<ConversationParticipant(id={self.id}, user_id={self.user_id}, other_user_id={self.other_user_id}, trip_id={self.trip_id}, cleared_at={self.cleared_at}, left_at={self.left_at})>"



