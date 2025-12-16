#!/usr/bin/env python3
"""
Wait for database to be ready.
"""
import sys
import time
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://triplink_user:triplink_secure_password_2024@db:5432/triplink"
)

max_retries = 30
retry_delay = 2

print("Waiting for database to be ready...")
for i in range(max_retries):
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
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
        sys.exit(1)

