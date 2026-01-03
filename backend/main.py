from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Synvoy API",
    description="Smart Travel & Shopping Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure this properly for production
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Synvoy API",
        "version": "1.0.0"
    }

# Import routes
from app.controllers.auth import router as auth_router
from app.controllers.connection import router as connection_router
from app.controllers.message import router as message_router
from app.controllers.trip import router as trip_router
from app.controllers.contact import router as contact_router
from app.controllers.expense import router as expense_router, settlement_router

# Include routers
app.include_router(auth_router)
app.include_router(connection_router)
app.include_router(message_router)
app.include_router(trip_router)
app.include_router(contact_router)
app.include_router(expense_router)
app.include_router(settlement_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Synvoy API",
        "docs": "/docs",
        "health": "/health"
    }

# Setup background scheduler for cleanup tasks
scheduler = BackgroundScheduler()
from app.utils.cleanup import cleanup_unverified_accounts, hard_delete_pending_accounts

# Schedule cleanup task to run every 30 minutes
scheduler.add_job(
    cleanup_unverified_accounts,
    trigger=IntervalTrigger(minutes=30),
    id='cleanup_unverified_accounts',
    name='Cleanup unverified accounts older than 2 hours',
    replace_existing=True
)

# Schedule hard delete task to run every hour
scheduler.add_job(
    hard_delete_pending_accounts,
    trigger=IntervalTrigger(hours=1),
    id='hard_delete_pending_accounts',
    name='Hard delete accounts past their deletion date',
    replace_existing=True
)

# Start scheduler when app starts
@app.on_event("startup")
async def startup_event():
    scheduler.start()
    print("Background scheduler started:")
    print("  - Cleanup task will run every 30 minutes")
    print("  - Hard delete task will run every hour")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    print("Background scheduler stopped")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    ) 