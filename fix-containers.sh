#!/bin/bash
# Script to fix container recreation issues

echo "=== Removing problematic containers ==="
docker-compose stop db backend 2>/dev/null
docker rm synvoy-db synvoy-backend 2>/dev/null || true

echo ""
echo "=== Checking if docker compose (v2) is available ==="
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "✓ docker compose (v2) is available"
    echo "Using: docker compose up -d db backend"
    docker compose up -d db backend
else
    echo "✗ docker compose (v2) not available, using docker-compose (v1)"
    echo "Creating containers without force-recreate..."
    docker-compose up -d db backend
fi

echo ""
echo "=== Waiting for containers to start ==="
sleep 5

echo ""
echo "=== Checking container status ==="
docker-compose ps db backend

echo ""
echo "=== Testing database connection from backend ==="
sleep 3
docker-compose exec backend python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        print('✓ Database connection successful!')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
" 2>&1 || echo "Backend not ready yet, wait a few more seconds and try again"

