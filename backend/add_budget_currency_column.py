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

def run_migration():
    conn = engine.connect()
    trans = conn.begin()
    inspector = inspect(engine)
    
    try:
        # Check if budget_currency column exists
        columns = [col['name'] for col in inspector.get_columns("trips")]
        
        if "budget_currency" not in columns:
            print("Adding 'budget_currency' column to 'trips' table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN budget_currency VARCHAR(3) NULL DEFAULT 'USD'"))
            print("✅ 'budget_currency' column added.")
        else:
            print("ℹ️  'budget_currency' column already exists.")

        trans.commit()
        print("✅ Migration completed successfully!")
        
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

