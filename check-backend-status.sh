#!/bin/bash
# Script to check backend status and diagnose issues

echo "=== Backend Container Status ==="
docker-compose ps backend

echo ""
echo "=== Backend Logs (last 50 lines) ==="
docker-compose logs --tail=50 backend

echo ""
echo "=== Testing Backend Health (using Python) ==="
docker-compose exec backend python -c "
import urllib.request
try:
    response = urllib.request.urlopen('http://localhost:8000/health', timeout=5)
    print('✓ Backend health check: OK')
    print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'✗ Backend health check failed: {e}')
" 2>&1

echo ""
echo "=== Checking if Backend Process is Running ==="
docker-compose exec backend ps aux | grep -E "(uvicorn|python)" || echo "No uvicorn process found"

echo ""
echo "=== Checking Database Connection from Backend ==="
docker-compose exec backend python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        print('✓ Database connection: OK')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
" 2>&1

echo ""
echo "=== Checking Network Connectivity ==="
docker-compose exec nginx ping -c 1 backend 2>&1 | head -5

