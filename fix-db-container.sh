#!/bin/bash
# Script to fix the problematic db container

echo "=== Removing problematic db container ==="
docker rm -f 3937384303f6_synvoy-db 2>/dev/null || true

# Also try to remove by container ID
docker rm -f 3937384303f6 2>/dev/null || true

# Remove any container with "synvoy-db" in the name
docker ps -a | grep "synvoy-db" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

echo ""
echo "=== Checking if docker compose (v2) is available ==="
if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    echo "✓ Using docker compose (v2)"
    docker compose up -d db
else
    echo "✗ Using docker-compose (v1)"
    # Use docker directly to create the container
    echo "Creating db container manually..."
    docker-compose create db
    docker-compose start db
fi

echo ""
echo "=== Waiting for database to start ==="
sleep 10

echo ""
echo "=== Checking container status ==="
docker-compose ps db

echo ""
echo "=== Creating backend container ==="
docker-compose up -d backend

echo ""
echo "=== Waiting for backend to start ==="
sleep 10

echo ""
echo "=== Testing database connection ==="
docker-compose exec backend python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        print('✓ Database connection successful!')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
" 2>&1

