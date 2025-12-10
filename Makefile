.PHONY: help install test lint format clean backend mobile web docs

# Default target
help:
	@echo "Synvoy Development Commands:"
	@echo ""
	@echo "Backend:"
	@echo "  backend-install    Install Python dependencies"
	@echo "  backend-run        Run FastAPI backend server"
	@echo "  backend-test       Run backend tests"
	@echo "  backend-lint       Run linting and type checking"
	@echo ""
	@echo "Mobile App:"
	@echo "  mobile-setup       Set up React Native project"
	@echo "  mobile-install     Install mobile app dependencies"
	@echo "  mobile-android     Run on Android"
	@echo ""
	@echo "Web App:"
	@echo "  web-setup          Set up Next.js project"
	@echo "  web-install        Install web app dependencies"
	@echo "  web-dev            Run web app in development mode"
	@echo ""
	@echo "General:"
	@echo "  install-all        Install all dependencies"
	@echo "  test-all           Run all tests"
	@echo "  lint-all           Run all linting"
	@echo "  format-all         Format all code"
	@echo "  clean              Clean build artifacts"
	@echo "  docs               Generate documentation"

# Backend commands
backend-install:
	@echo "Installing backend dependencies..."
	cd backend && . .venv/bin/activate && pip install -r requirements.txt

backend-run:
	@echo "Starting FastAPI backend..."
	cd backend && . .venv/bin/activate && python3 main.py

backend-test:
	@echo "Running backend tests..."
	cd backend && . .venv/bin/activate && pytest

backend-lint:
	@echo "Running backend linting..."
	cd backend && . .venv/bin/activate && black app/ && flake8 app/ && mypy app/

# Mobile app commands
mobile-setup:
	@echo "Setting up React Native project..."
	cd mobile-app && npx react-native@latest init SynvoyMobile --template react-native-template-typescript

mobile-install:
	@echo "Installing mobile app dependencies..."
	cd mobile-app/SynvoyMobile && npm install

mobile-android:
	@echo "Running mobile app on Android..."
	cd mobile-app/SynvoyMobile && npm run android

# Web app commands
web-setup:
	@echo "Setting up Next.js project..."
	cd web-app && npx create-next-app@latest synvoy-web --typescript --tailwind --eslint

web-install:
	@echo "Installing web app dependencies..."
	cd web-app/synvoy-web && npm install

web-dev:
	@echo "Starting web app in development mode..."
	cd web-app/synvoy-web && npm run dev

# General commands
install-all: backend-install
	@echo "All dependencies installed!"

test-all: backend-test
	@echo "All tests completed!"

lint-all: backend-lint
	@echo "All linting completed!"

format-all: backend-lint
	@echo "All code formatted!"

clean:
	@echo "Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +

docs:
	@echo "Generating documentation..."
	@echo "Backend API docs available at: http://localhost:8000/docs"
	@echo "Backend ReDoc available at: http://localhost:8000/redoc" 