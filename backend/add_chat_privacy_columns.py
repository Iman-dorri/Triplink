"""
Migration script to add chat privacy columns:
1. Add conversation_participants table
2. Add deleted_for_everyone_at and deleted_for_everyone_by to messages table
"""
import sys
from sqlalchemy import create_engine, text
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load .env file for local development (but Docker env vars will override)
load_dotenv()

# Database URL from environment variables
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

def run_migration():
    """Add chat privacy columns and conversation_participants table."""
    conn = engine.connect()
    trans = conn.begin()
    try:
        print("Creating 'conversation_participants' table...")
        
        # Create conversation_participants table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS conversation_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                other_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
                cleared_at TIMESTAMP WITH TIME ZONE,
                left_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT conversation_participants_unique UNIQUE (user_id, other_user_id, trip_id),
                CONSTRAINT conversation_participants_check CHECK (
                    (other_user_id IS NOT NULL AND trip_id IS NULL) OR
                    (other_user_id IS NULL AND trip_id IS NOT NULL)
                )
            )
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
            ON conversation_participants(user_id)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversation_participants_other_user_id 
            ON conversation_participants(other_user_id)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversation_participants_trip_id 
            ON conversation_participants(trip_id)
        """))
        
        print("Adding 'deleted_for_everyone_at' and 'deleted_for_everyone_by' columns to 'messages' table...")
        
        # Add deleted_for_everyone_at column
        conn.execute(text("""
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMP WITH TIME ZONE
        """))
        
        # Add deleted_for_everyone_by column
        conn.execute(text("""
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS deleted_for_everyone_by UUID REFERENCES users(id) ON DELETE SET NULL
        """))
        
        # Create index on deleted_for_everyone_at for filtering
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_everyone_at 
            ON messages(deleted_for_everyone_at) 
            WHERE deleted_for_everyone_at IS NOT NULL
        """))
        
        # Commit transaction
        trans.commit()
        
        print("✅ Migration completed successfully!")
        print("  - Created 'conversation_participants' table")
        print("  - Added 'deleted_for_everyone_at' column to 'messages' table")
        print("  - Added 'deleted_for_everyone_by' column to 'messages' table")
        print("  - Created indexes for performance")
        
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

