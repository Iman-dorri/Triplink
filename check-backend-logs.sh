#!/bin/bash
# Script to check backend logs and diagnose login 500 error

echo "=== Checking Backend Container Status ==="
docker-compose ps backend

echo ""
echo "=== Recent Backend Logs (last 100 lines) ==="
docker-compose logs --tail=100 backend

echo ""
echo "=== Testing Backend Health Endpoint ==="
curl -I http://localhost/api/health

echo ""
echo "=== Testing Database Connection from Backend ==="
docker-compose exec backend python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        print('Database connection: OK')
except Exception as e:
    print(f'Database connection error: {e}')
"

echo ""
echo "=== Checking Environment Variables ==="
docker-compose exec backend env | grep -E "(SECRET_KEY|DATABASE_URL|POSTGRES)"

