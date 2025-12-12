"""Check user_connections table structure."""
from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)

if 'user_connections' in inspector.get_table_names():
    cols = inspector.get_columns('user_connections')
    print('user_connections table columns:')
    for col in cols:
        print(f"  {col['name']}: {col['type']}")
    
    # Check foreign keys
    fks = inspector.get_foreign_keys('user_connections')
    print('\nForeign keys:')
    for fk in fks:
        print(f"  {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")



