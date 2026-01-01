# Local Development Setup

This guide shows how to run backend and frontend locally while keeping the database and n8n in Docker.

## Quick Start

### 1. Stop Docker Services (Keep Database Running)

```bash
./stop-for-local-dev.sh
```

Or manually:
```bash
docker compose stop backend frontend nginx
```

This keeps running:
- ✅ `synvoy-db` (PostgreSQL database)
- ✅ `synvoy-n8n` (n8n workflow automation)
- ✅ `synvoy-n8n-postgres` (n8n database)

### 2. Start Backend Locally

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will:
- Connect to the Docker database at `localhost:5433`
- Auto-reload on code changes (thanks to `--reload`)
- Be accessible at `http://localhost:8000`

### 3. Start Frontend Locally

Open a new terminal:

```bash
cd web-app/synvoy-web
npm run dev
```

The frontend will:
- Run on `http://localhost:3000` (default Next.js port)
- Hot-reload on code changes
- Connect to backend at `http://localhost:8000/api`

## Database Connection from IDE

The database is still running in Docker, so use these connection details:

- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `synvoy`
- **Username:** `synvoy_user`
- **Password:** Check your `.env` file for `POSTGRES_PASSWORD`

## Environment Variables

### Backend

The backend will use environment variables from:
1. `backend/.env` file (if exists)
2. System environment variables
3. Docker Compose variables (if running in Docker)

For local development, make sure `backend/.env` has:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=synvoy_user
POSTGRES_PASSWORD=your_password_from_root_env
POSTGRES_DB=synvoy
```

### Frontend

The frontend needs to know where the backend API is. Check `web-app/synvoy-web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Or set it in `next.config.js` if not using environment variables.

## Verify Everything is Working

### Check Backend
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"healthy","service":"Synvoy API","version":"1.0.0"}`

### Check Frontend
Open browser: `http://localhost:3000`

### Check Database Connection
```bash
PGPASSWORD="your_password" psql -h localhost -p 5433 -U synvoy_user -d synvoy -c "\dt"
```

## Troubleshooting

### Backend Can't Connect to Database

**Problem:** `connection to server at "localhost" (127.0.0.1), port 5433 failed`

**Solution:**
1. Make sure database container is running:
   ```bash
   docker compose ps db
   ```
2. If not running:
   ```bash
   docker compose start db
   ```
3. Check port mapping:
   ```bash
   docker ps | grep synvoy-db
   ```
   Should show: `0.0.0.0:5433->5432/tcp`

### Frontend Can't Connect to Backend

**Problem:** API calls fail with connection errors

**Solution:**
1. Make sure backend is running on port 8000
2. Check `NEXT_PUBLIC_API_URL` in frontend environment
3. Verify CORS settings in backend allow `http://localhost:3000`

### Port Already in Use

**Problem:** `Address already in use` when starting backend/frontend

**Solution:**
1. Check what's using the port:
   ```bash
   # For port 8000 (backend)
   lsof -i :8000
   # For port 3000 (frontend)
   lsof -i :3000
   ```
2. Stop the process or use a different port:
   ```bash
   # Backend on different port
   uvicorn main:app --reload --host 0.0.0.0 --port 8001
   
   # Frontend on different port
   PORT=3001 npm run dev
   ```

## Restart Docker Services

When you're done with local development and want to use Docker again:

```bash
docker compose start backend frontend nginx
```

Or restart everything:
```bash
docker compose up -d
```

## Benefits of Local Development

- ✅ Faster code reload (no Docker rebuild)
- ✅ Better debugging (direct access to code)
- ✅ IDE integration (breakpoints, step-through debugging)
- ✅ Hot module replacement in frontend
- ✅ Database still in Docker (consistent with production)











