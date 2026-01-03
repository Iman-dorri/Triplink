from sqlalchemy import Column, String, DateTime, Boolean, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    preferences = Column(JSON, default={})
    is_verified = Column(Boolean, default=False)
    status = Column(String(50), default='pending_verification')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deletion_requested_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    hard_delete_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    trips = relationship("Trip", foreign_keys="Trip.user_id", back_populates="creator", cascade="all, delete-orphan")
    trip_participations = relationship("TripParticipant", back_populates="user", cascade="all, delete-orphan")
    # price_alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    # shopping_items = relationship("ShoppingItem", back_populates="user", cascade="all, delete-orphan")
    connections = relationship("UserConnection", 
                            foreign_keys="UserConnection.user_id",
                            back_populates="user",
                            cascade="all, delete-orphan")
    connected_to = relationship("UserConnection",
                              foreign_keys="UserConnection.connected_user_id",
                              back_populates="connected_user",
                              cascade="all, delete-orphan")
    sent_messages = relationship("Message",
                                foreign_keys="Message.sender_id",
                                back_populates="sender",
                                cascade="all, delete-orphan")
    received_messages = relationship("Message",
                                    foreign_keys="Message.receiver_id",
                                    back_populates="receiver",
                                    cascade="all, delete-orphan")
    # Expense relationships
    created_expenses = relationship("Expense", foreign_keys="Expense.created_by_user_id", back_populates="creator")
    paid_expenses = relationship("Expense", foreign_keys="Expense.payer_user_id", back_populates="payer")
    expense_splits = relationship("ExpenseSplit", back_populates="user")
    # notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.first_name} {self.last_name}')>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}" 