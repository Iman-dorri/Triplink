"""Check database schema."""
from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)
tables = inspector.get_table_names()
print('Existing tables:', tables)

if 'users' in tables:
    cols = inspector.get_columns('users')
    print('\nUsers table columns:')
    for col in cols:
        print(f"  {col['name']}: {col['type']}")

if 'user_connections' in tables:
    print('\nuser_connections table exists')
else:
    print('\nuser_connections table does NOT exist')

if 'messages' in tables:
    print('\nmessages table exists')
else:
    print('\nmessages table does NOT exist')




