# Docker Setup Guide

This guide explains how to run the TripLink application using Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd TripLink
   ```

2. **Set up environment variables**:
   ```bash
   cp docker-compose.env.example .env
   ```
   
   Edit `.env` file and update the following values:
   - `POSTGRES_PASSWORD`: Set a strong password for the database
   - `SECRET_KEY`: Set a secure JWT secret key
   - `NEXT_PUBLIC_API_URL`: Set to your backend URL (e.g., `http://localhost:8000` or your server IP)

3. **Build and start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Check service status**:
   ```bash
   docker-compose ps
   ```

5. **View logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f db
   ```

## Services

The Docker Compose setup includes three services:

### 1. Database (PostgreSQL)
- **Container**: `triplink-db`
- **Port**: 5432 (default)
- **Volume**: `postgres_data` (persistent storage)
- **Health Check**: Automatically checks database readiness

### 2. Backend (FastAPI)
- **Container**: `triplink-backend`
- **Port**: 8000 (default)
- **Endpoints**:
  - API: `http://localhost:8000`
  - Docs: `http://localhost:8000/docs`
  - Health: `http://localhost:8000/health`
- **Auto-initialization**: Automatically creates database tables on first start

### 3. Frontend (Next.js)
- **Container**: `triplink-frontend`
- **Port**: 3000 (default)
- **URL**: `http://localhost:3000`

## Environment Variables

Key environment variables (set in `.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `triplink_user` |
| `POSTGRES_PASSWORD` | Database password | `triplink_secure_password_2024` |
| `POSTGRES_DB` | Database name | `triplink` |
| `POSTGRES_PORT` | Database port | `5432` |
| `BACKEND_PORT` | Backend API port | `8000` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `SECRET_KEY` | JWT secret key | (change in production) |
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend | `http://localhost:8000` |

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose stop
```

### Stop and remove containers
```bash
docker-compose down
```

### Stop and remove containers + volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### Rebuild services (after code changes)
```bash
docker-compose build
docker-compose up -d
```

### Rebuild specific service
```bash
docker-compose build backend
docker-compose up -d backend
```

### View logs
```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend sh

# Database shell
docker-compose exec db psql -U triplink_user -d triplink

# Frontend shell
docker-compose exec frontend sh
```

### Restart a service
```bash
docker-compose restart backend
```

## Database Management

### Access Database
```bash
docker-compose exec db psql -U triplink_user -d triplink
```

### Backup Database
```bash
docker-compose exec db pg_dump -U triplink_user triplink > backup.sql
```

### Restore Database
```bash
docker-compose exec -T db psql -U triplink_user triplink < backup.sql
```

### Reset Database (⚠️ deletes all data)
```bash
docker-compose down -v
docker-compose up -d
```

## Development

### Hot Reload

For development with hot reload, you can mount volumes:

- Backend: Already configured with volume mount for code changes
- Frontend: For Next.js hot reload, you may want to run it locally instead of in Docker

### Running Backend Locally with Docker Database

If you want to run the backend locally but use the Docker database:

1. Start only the database:
   ```bash
   docker-compose up -d db
   ```

2. Update your local `.env` file:
   ```
   DATABASE_URL=postgresql://triplink_user:triplink_secure_password_2024@localhost:5432/triplink
   ```

3. Run backend locally:
   ```bash
   cd backend
   python main.py
   ```

## Production Deployment

For production deployment:

1. **Update environment variables**:
   - Set strong `POSTGRES_PASSWORD`
   - Set secure `SECRET_KEY`
   - Update `NEXT_PUBLIC_API_URL` to your production domain
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=False`

2. **Use production-optimized images**:
   - Consider using specific version tags instead of `latest`
   - Use multi-stage builds (already configured)

3. **Set up reverse proxy** (recommended):
   - Use Nginx or Traefik in front of the services
   - Configure SSL/TLS certificates

4. **Backup strategy**:
   - Set up regular database backups
   - Use volume backups for persistent data

5. **Monitoring**:
   - Set up health checks (already configured)
   - Monitor logs and resource usage

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are already in use
netstat -tulpn | grep -E ':(3000|8000|5432)'
```

### Database connection errors
- Ensure database is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs db`
- Verify DATABASE_URL in backend environment

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check if backend is running: `docker-compose ps backend`
- Check backend logs: `docker-compose logs backend`
- Test backend health: `curl http://localhost:8000/health`

### Permission errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

### Rebuild everything from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Network Configuration

All services are on the `triplink-network` bridge network. Services can communicate using their service names:
- Backend → Database: `db:5432`
- Frontend → Backend: Use `NEXT_PUBLIC_API_URL` (external URL for browser)

## Volumes

- `postgres_data`: Persistent PostgreSQL data storage
- `./backend:/app`: Backend code mount (for development)

## Health Checks

All services have health checks configured:
- Database: Checks if PostgreSQL is ready
- Backend: Checks `/health` endpoint
- Frontend: Relies on Next.js server status

Check health status:
```bash
docker-compose ps
```

