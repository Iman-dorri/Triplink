#!/bin/bash

# Docker Quick Start Script for TripLink

set -e

echo "🚀 Starting TripLink with Docker Compose..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from docker-compose.env.example..."
    cp docker-compose.env.example .env
    echo "⚠️  Please edit .env file and update SECRET_KEY and POSTGRES_PASSWORD before continuing!"
    echo "Press Enter to continue after editing .env, or Ctrl+C to cancel..."
    read
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version > /dev/null 2>&1 && ! docker-compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Build and start services
echo "🔨 Building Docker images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "✅ TripLink is starting up!"
echo ""
echo "🌐 Services will be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "📋 To view logs: docker compose logs -f"
echo "🛑 To stop: docker compose down"
echo ""

