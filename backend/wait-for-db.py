#!/usr/bin/env python3
"""
Wait for database to be ready.
"""
import sys
import time
import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Get DATABASE_URL from environment, or construct from individual components
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construct DATABASE_URL from individual components with proper URL encoding
    db_user = os.getenv("POSTGRES_USER", "synvoy_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "synvoy_secure_password_2024")
    db_host = os.getenv("POSTGRES_HOST", "db")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "synvoy")
    
    # URL-encode the password to handle special characters like @, :, /, etc.
    encoded_password = quote_plus(db_password)
    DATABASE_URL = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"

max_retries = 30
retry_delay = 2

print("Waiting for database to be ready...")
for i in range(max_retries):
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        print("Database is ready!")
        sys.exit(0)
    except OperationalError as e:
        if i < max_retries - 1:
            print(f"Database is unavailable - sleeping ({i+1}/{max_retries})...")
            time.sleep(retry_delay)
        else:
            print(f"Database connection failed after {max_retries} attempts: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

