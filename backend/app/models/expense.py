from sqlalchemy import Column, String, DateTime, Integer, Numeric, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    payer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Amount stored in cents (integer) to avoid floating-point issues
    amount_cents = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    
    # Expense type: 'NORMAL' or 'ADJUSTMENT'
    type = Column(String(20), default='NORMAL', nullable=False)
    # If this is an adjustment, reference the original expense
    adjusts_expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)
    
    # Status: 'ACTIVE' or 'VOID'
    status = Column(String(20), default='ACTIVE', nullable=False)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    voided_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Lock status - expense is locked when included in a PAID settlement
    is_locked = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="expenses")
    creator = relationship("User", foreign_keys=[created_by_user_id], back_populates="created_expenses")
    payer = relationship("User", foreign_keys=[payer_user_id], back_populates="paid_expenses")
    voided_by = relationship("User", foreign_keys=[voided_by_user_id])
    adjusts_expense = relationship("Expense", remote_side=[id], foreign_keys=[adjusts_expense_id])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
    audit_logs = relationship("ExpenseAuditLog", back_populates="expense", cascade="all, delete-orphan")
    settlement_expenses = relationship("SettlementExpense", back_populates="expense")
    
    def __repr__(self):
        return f"<Expense(id={self.id}, amount_cents={self.amount_cents}, status='{self.status}')>"
    
    @property
    def amount(self):
        """Return amount in dollars (float with 2 decimal places)."""
        return round(self.amount_cents / 100.0, 2)
    
    @amount.setter
    def amount(self, value):
        """Set amount from dollars, converting to cents."""
        self.amount_cents = int(round(value * 100))


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Share stored in cents (integer) to avoid floating-point issues
    share_cents = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")
    
    def __repr__(self):
        return f"<ExpenseSplit(id={self.id}, user_id={self.user_id}, share_cents={self.share_cents})>"
    
    @property
    def share(self):
        """Return share in dollars (float with 2 decimal places)."""
        return round(self.share_cents / 100.0, 2)
    
    @share.setter
    def share(self, value):
        """Set share from dollars, converting to cents."""
        self.share_cents = int(round(value * 100))


class ExpenseAuditLog(Base):
    __tablename__ = "expense_audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Action type: 'EXPENSE_CREATED', 'EXPENSE_EDITED', 'EXPENSE_VOIDED'
    action = Column(String(50), nullable=False)
    
    # Store old and new values as JSON
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    
    # Optional reason for edits
    reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[actor_user_id])
    
    def __repr__(self):
        return f"<ExpenseAuditLog(id={self.id}, action='{self.action}', expense_id={self.expense_id})>"


class Settlement(Base):
    __tablename__ = "settlements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Status: 'PENDING' or 'PAID'
    status = Column(String(20), default='PENDING', nullable=False)
    
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="settlements")
    creator = relationship("User", foreign_keys=[created_by_user_id])
    settlement_expenses = relationship("SettlementExpense", back_populates="settlement", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Settlement(id={self.id}, trip_id={self.trip_id}, status='{self.status}')>"


class SettlementExpense(Base):
    __tablename__ = "settlement_expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    settlement_id = Column(UUID(as_uuid=True), ForeignKey("settlements.id"), nullable=False)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    settlement = relationship("Settlement", back_populates="settlement_expenses")
    expense = relationship("Expense", back_populates="settlement_expenses")
    
    def __repr__(self):
        return f"<SettlementExpense(id={self.id}, settlement_id={self.settlement_id}, expense_id={self.expense_id})>"


