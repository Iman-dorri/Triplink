# Synvoy Backend

FastAPI-based backend for the Synvoy Smart Travel & Shopping Platform.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure user authentication
- **Pydantic** - Data validation using Python type annotations

## Setup

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment file
cp env.example .env

# Edit .env with your database credentials
DATABASE_URL=postgresql://username:password@localhost:5432/synvoy
SECRET_KEY=your-secret-key-here
```

### 3. Database Setup

```bash
# Install PostgreSQL and create database
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb synvoy
sudo -u postgres createuser synvoy_user

# Run database migrations (when implemented)
alembic upgrade head
```

### 4. Run the Application

```bash
# Development mode
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- **Health Check**: `GET /health`
- **API Documentation**: `GET /docs` (Swagger UI)
- **ReDoc Documentation**: `GET /redoc`

### Authentication Endpoints

- **Register**: `POST /auth/register`
- **Login**: `POST /auth/login`
- **Get Current User**: `GET /auth/me`

## Development

### Project Structure

```
backend/
├── app/
│   ├── controllers/     # API route handlers
│   ├── models/         # Database models
│   ├── schemas/        # Pydantic models
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── tests/              # Test files
├── alembic/            # Database migrations
├── main.py             # Application entry point
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

## Next Steps

1. Implement database migrations with Alembic
2. Add more API endpoints for trips, destinations, etc.
3. Implement proper JWT middleware
4. Add comprehensive testing
5. Set up CI/CD pipeline 