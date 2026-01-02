from sqlalchemy import Column, String, DateTime, Boolean, JSON, Text, Integer, Numeric, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Numeric(10, 2), nullable=True)
    budget_currency = Column(String(3), nullable=True, default='USD')  # ISO 4217 currency code (USD, EUR, GBP, etc.)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="planning")  # planning, active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[user_id], back_populates="trips")
    participants = relationship("TripParticipant", back_populates="trip", cascade="all, delete-orphan")
    destinations = relationship("Destination", back_populates="trip", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="trip", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Trip(id={self.id}, title='{self.title}', status='{self.status}')>"

class TripParticipant(Base):
    __tablename__ = "trip_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # creator, member
    status = Column(String(50), default="pending")  # pending, accepted, declined
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    joined_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    trip = relationship("Trip", back_populates="participants")
    user = relationship("User", back_populates="trip_participations")
    
    def __repr__(self):
        return f"<TripParticipant(id={self.id}, trip_id={self.trip_id}, user_id={self.user_id}, status='{self.status}')>"

class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    arrival_date = Column(DateTime(timezone=True), nullable=True)
    departure_date = Column(DateTime(timezone=True), nullable=True)
    priority = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="destinations")
    
    def __repr__(self):
        return f"<Destination(id={self.id}, city='{self.city}', country='{self.country}')>" 