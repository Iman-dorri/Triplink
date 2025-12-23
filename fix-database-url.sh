#!/bin/bash
# Script to check and fix DATABASE_URL issue

echo "=== Checking DATABASE_URL in backend container ==="
docker-compose exec backend env | grep DATABASE_URL

echo ""
echo "=== Checking POSTGRES_USER and POSTGRES_PASSWORD ==="
docker-compose exec backend env | grep POSTGRES

echo ""
echo "=== Checking .env file values (first few chars only for security) ==="
grep POSTGRES_USER .env | head -c 50
echo ""
grep POSTGRES_PASSWORD .env | head -c 50
echo ""

echo "=== Testing database connection with correct format ==="
echo "The DATABASE_URL should be: postgresql://USERNAME:PASSWORD@db:5432/DATABASE"
echo "But it seems to be malformed. Let's check the actual values..."

