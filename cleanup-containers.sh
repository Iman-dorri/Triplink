#!/bin/bash
# Script to clean up existing Synvoy containers

echo "Stopping and removing existing Synvoy containers..."

# Stop all containers
docker stop synvoy-db synvoy-backend synvoy-frontend synvoy-nginx 2>/dev/null

# Remove all containers
docker rm synvoy-db synvoy-backend synvoy-frontend synvoy-nginx 2>/dev/null

# Or use docker compose down if you're in the project directory
if [ -f "docker-compose.yml" ]; then
    echo "Using docker compose down..."
    docker compose down
fi

echo "Cleanup complete. You can now run: docker compose up -d --build"


