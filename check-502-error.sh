#!/bin/bash
# Script to diagnose 502 Bad Gateway error

echo "=== Checking Backend Container Status ==="
docker-compose ps backend

echo ""
echo "=== Checking Backend Logs (last 30 lines) ==="
docker-compose logs --tail=30 backend

echo ""
echo "=== Testing Backend Health Endpoint ==="
docker-compose exec backend curl -s http://localhost:8000/health || echo "Backend not responding on port 8000"

echo ""
echo "=== Testing Backend from Nginx Container ==="
docker-compose exec nginx curl -s http://backend:8000/health || echo "Nginx cannot reach backend"

echo ""
echo "=== Checking Nginx Error Logs ==="
docker-compose exec nginx tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Cannot read nginx error log"

echo ""
echo "=== Checking if Backend is on the Network ==="
docker network inspect synvoy_synvoy-network 2>/dev/null | grep -A 5 "synvoy-backend" || \
docker network inspect synvoy-network 2>/dev/null | grep -A 5 "synvoy-backend" || \
echo "Backend not found on network"

