"""
Migration script to add deletion-related columns to the users table.
Run this script to add the new columns for account deletion feature.
"""
import sys
from sqlalchemy import text
from app.database import engine, SessionLocal

def add_deletion_columns():
    """Add deletion-related columns to users table."""
    db = SessionLocal()
    try:
        print("Adding deletion-related columns to users table...")
        
        # Check if columns already exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('deletion_requested_at', 'deleted_at', 'hard_delete_at')
        """)
        existing_columns = db.execute(check_query).fetchall()
        existing_column_names = [col[0] for col in existing_columns]
        
        # Add columns if they don't exist
        if 'deletion_requested_at' not in existing_column_names:
            print("Adding deletion_requested_at column...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN deletion_requested_at TIMESTAMP WITH TIME ZONE
            """))
            print("✓ Added deletion_requested_at column")
        else:
            print("✓ deletion_requested_at column already exists")
        
        if 'deleted_at' not in existing_column_names:
            print("Adding deleted_at column...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE
            """))
            print("✓ Added deleted_at column")
        else:
            print("✓ deleted_at column already exists")
        
        if 'hard_delete_at' not in existing_column_names:
            print("Adding hard_delete_at column...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN hard_delete_at TIMESTAMP WITH TIME ZONE
            """))
            print("✓ Added hard_delete_at column")
        else:
            print("✓ hard_delete_at column already exists")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
        # Check if deletion_cancellation_tokens table exists
        check_table_query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'deletion_cancellation_tokens'
            )
        """)
        table_exists = db.execute(check_table_query).scalar()
        
        if not table_exists:
            print("\nCreating deletion_cancellation_tokens table...")
            from app.models.deletion_cancellation_token import DeletionCancellationToken
            from app.database import Base
            DeletionCancellationToken.__table__.create(bind=engine, checkfirst=True)
            print("✓ Created deletion_cancellation_tokens table")
        else:
            print("✓ deletion_cancellation_tokens table already exists")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    add_deletion_columns()






