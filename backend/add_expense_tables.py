"""
Migration script to create expense-related tables.
Run this script to add expense, expense_split, expense_audit_log, settlement, and settlement_expense tables.
"""
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_user = os.getenv("POSTGRES_USER", "synvoy_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "synvoy_secure_password_2024")
    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = os.getenv("POSTGRES_PORT", "5433")
    db_name = os.getenv("POSTGRES_DB", "synvoy")
    
    encoded_password = quote_plus(db_password)
    DATABASE_URL = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def table_exists(inspector, table_name):
    """Check if a table exists."""
    return table_name in inspector.get_table_names()

def run_migration():
    conn = engine.connect()
    trans = conn.begin()
    inspector = inspect(engine)
    
    try:
        # Create expenses table
        if not table_exists(inspector, "expenses"):
            print("Creating 'expenses' table...")
            conn.execute(text("""
                CREATE TABLE expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                    description TEXT,
                    type VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (type IN ('NORMAL', 'ADJUSTMENT')),
                    adjusts_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOID')),
                    voided_at TIMESTAMP WITH TIME ZONE,
                    voided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("✅ Created 'expenses' table.")
            
            # Create indexes
            conn.execute(text("CREATE INDEX idx_expenses_trip_id ON expenses(trip_id)"))
            conn.execute(text("CREATE INDEX idx_expenses_created_by_user_id ON expenses(created_by_user_id)"))
            conn.execute(text("CREATE INDEX idx_expenses_payer_user_id ON expenses(payer_user_id)"))
            conn.execute(text("CREATE INDEX idx_expenses_status ON expenses(status)"))
            conn.execute(text("CREATE INDEX idx_expenses_is_locked ON expenses(is_locked)"))
            print("✅ Created indexes on 'expenses' table.")
        else:
            print("ℹ️  'expenses' table already exists.")
        
        # Create expense_splits table
        if not table_exists(inspector, "expense_splits"):
            print("Creating 'expense_splits' table...")
            conn.execute(text("""
                CREATE TABLE expense_splits (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    share_cents INTEGER NOT NULL CHECK (share_cents >= 0),
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT expense_splits_expense_user_unique UNIQUE(expense_id, user_id)
                )
            """))
            print("✅ Created 'expense_splits' table.")
            
            # Create indexes
            conn.execute(text("CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id)"))
            conn.execute(text("CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id)"))
            print("✅ Created indexes on 'expense_splits' table.")
        else:
            print("ℹ️  'expense_splits' table already exists.")
        
        # Create expense_audit_logs table
        if not table_exists(inspector, "expense_audit_logs"):
            print("Creating 'expense_audit_logs' table...")
            conn.execute(text("""
                CREATE TABLE expense_audit_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    action VARCHAR(50) NOT NULL CHECK (action IN ('EXPENSE_CREATED', 'EXPENSE_EDITED', 'EXPENSE_VOIDED')),
                    old_values JSONB,
                    new_values JSONB,
                    reason TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created 'expense_audit_logs' table.")
            
            # Create indexes
            conn.execute(text("CREATE INDEX idx_expense_audit_logs_expense_id ON expense_audit_logs(expense_id)"))
            conn.execute(text("CREATE INDEX idx_expense_audit_logs_actor_user_id ON expense_audit_logs(actor_user_id)"))
            conn.execute(text("CREATE INDEX idx_expense_audit_logs_created_at ON expense_audit_logs(created_at)"))
            print("✅ Created indexes on 'expense_audit_logs' table.")
        else:
            print("ℹ️  'expense_audit_logs' table already exists.")
        
        # Create settlements table
        if not table_exists(inspector, "settlements"):
            print("Creating 'settlements' table...")
            conn.execute(text("""
                CREATE TABLE settlements (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
                    paid_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created 'settlements' table.")
            
            # Create indexes
            conn.execute(text("CREATE INDEX idx_settlements_trip_id ON settlements(trip_id)"))
            conn.execute(text("CREATE INDEX idx_settlements_created_by_user_id ON settlements(created_by_user_id)"))
            conn.execute(text("CREATE INDEX idx_settlements_status ON settlements(status)"))
            print("✅ Created indexes on 'settlements' table.")
        else:
            print("ℹ️  'settlements' table already exists.")
        
        # Create settlement_expenses table
        if not table_exists(inspector, "settlement_expenses"):
            print("Creating 'settlement_expenses' table...")
            conn.execute(text("""
                CREATE TABLE settlement_expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
                    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(settlement_id, expense_id)
                )
            """))
            print("✅ Created 'settlement_expenses' table.")
            
            # Create indexes
            conn.execute(text("CREATE INDEX idx_settlement_expenses_settlement_id ON settlement_expenses(settlement_id)"))
            conn.execute(text("CREATE INDEX idx_settlement_expenses_expense_id ON settlement_expenses(expense_id)"))
            print("✅ Created indexes on 'settlement_expenses' table.")
        else:
            print("ℹ️  'settlement_expenses' table already exists.")
        
        trans.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        trans.rollback()
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()

