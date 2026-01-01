#!/bin/bash
# Quick deployment script for Synvoy on Contabo server

set -e  # Exit on error

echo "🚀 Starting Synvoy Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp docker-compose.env.example .env
    echo "⚠️  Please edit .env file with your production values before continuing!"
    echo "   Run: nano .env"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use no-SSL config for initial setup
if [ ! -f nginx/nginx.conf ]; then
    echo "📋 Setting up nginx config (no-SSL for initial setup)..."
    cp nginx/nginx.conf.no-ssl nginx/nginx.conf
fi

# Build and start all services
echo "🔨 Building and starting services..."
docker compose up -d --build

# Wait a bit for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Check logs: docker compose logs -f"
echo "   2. Verify services: docker compose ps"
echo "   3. Test your site: http://your-server-ip"
echo "   4. Set up SSL: Follow DEPLOYMENT.md Step 4"
echo ""
echo "🔍 Useful commands:"
echo "   - View logs: docker compose logs -f"
echo "   - Restart: docker compose restart"
echo "   - Stop: docker compose down"
echo "   - Update: git pull && docker compose up -d --build"













