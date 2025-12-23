#!/bin/bash
# Script to diagnose and fix database connection issues

echo "=== Checking Container Status ==="
docker-compose ps

echo ""
echo "=== Checking Network Configuration ==="
docker network inspect synvoy_synvoy-network 2>/dev/null || docker network inspect synvoy-network 2>/dev/null || echo "Network not found"

echo ""
echo "=== Checking if backend can resolve 'db' hostname ==="
docker-compose exec backend nslookup db 2>/dev/null || docker-compose exec backend ping -c 1 db 2>/dev/null || echo "Cannot resolve 'db'"

echo ""
echo "=== Checking Database Container Network ==="
docker inspect synvoy-db | grep -A 10 "Networks"

echo ""
echo "=== Checking Backend Container Network ==="
docker inspect synvoy-backend | grep -A 10 "Networks"

echo ""
echo "=== Attempting Fix: Restarting containers ==="
echo "This will restart the backend and db containers to ensure they're on the same network..."

