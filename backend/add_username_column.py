"""
Migration script to add username column to users table.
Run this script to add the username column to existing databases.
"""
import sys
from sqlalchemy import text
from app.database import engine

def add_username_column():
    """Add username column to users table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            # Check if username column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='username'
            """))
            
            if result.fetchone():
                print("Username column already exists. Skipping migration.")
                return
            
            # Add username column
            print("Adding username column to users table...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN username VARCHAR(50) UNIQUE
            """))
            
            # Create index for username
            print("Creating index on username...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)
            """))
            
            # For existing users, generate a username from email
            print("Generating usernames for existing users...")
            # Use a more robust approach to handle potential conflicts
            conn.execute(text("""
                UPDATE users 
                SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]', '', 'g'))
                WHERE username IS NULL
            """))
            
            # Handle any remaining NULLs or conflicts by appending user ID
            conn.execute(text("""
                UPDATE users 
                SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]', '', 'g')) || '_' || SUBSTRING(id::text, 1, 8)
                WHERE username IS NULL OR username = ''
            """))
            
            # Make username NOT NULL after populating
            print("Making username NOT NULL...")
            conn.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN username SET NOT NULL
            """))
            
            conn.commit()
            print("Username column added successfully!")
            
    except Exception as e:
        print(f"Error adding username column: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    add_username_column()

