#!/bin/bash
# Script to properly recreate db and backend containers

echo "=== Checking existing containers ==="
docker ps -a | grep -E "(synvoy-db|synvoy-backend|db|backend)" || echo "No matching containers found"

echo ""
echo "=== Stopping all synvoy containers ==="
docker-compose stop

echo ""
echo "=== Removing db and backend containers (if they exist) ==="
docker rm -f synvoy-db synvoy-backend 2>/dev/null || true
docker ps -a | grep -E "synvoy.*db|synvoy.*backend" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

echo ""
echo "=== Recreating db and backend ==="
docker-compose up -d db

echo ""
echo "=== Waiting for database to be healthy ==="
sleep 10

echo ""
echo "=== Starting backend ==="
docker-compose up -d backend

echo ""
echo "=== Waiting for backend to start ==="
sleep 10

echo ""
echo "=== Checking container status ==="
docker-compose ps db backend

echo ""
echo "=== Testing database connection from backend ==="
docker-compose exec backend python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        print('✓ Database connection successful!')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
" 2>&1

