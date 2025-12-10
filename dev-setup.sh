#!/bin/bash

# Synvoy Development Setup Script
# This script helps set up the development environment

echo "🚀 Setting up Synvoy Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        print_success "Python found: $PYTHON_VERSION"
    else
        print_error "Python 3 is not installed. Please install Python 3.8+"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL found"
    else
        print_warning "PostgreSQL not found. You'll need to install it for the backend."
    fi
}

# Setup Python backend
setup_backend() {
    print_status "Setting up Python backend..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        print_warning "Please edit .env file with your database credentials"
    fi
    
    cd ..
    print_success "Backend setup completed!"
}

# Setup React Native mobile app
setup_mobile() {
    print_status "Setting up React Native mobile app..."
    
    cd mobile-app
    
    # Check if React Native project already exists
    if [ ! -d "SynvoyMobile" ]; then
        print_status "Creating React Native project..."
        npx react-native@latest init SynvoyMobile --template react-native-template-typescript
        
        cd SynvoyMobile
        
        print_status "Installing mobile app dependencies..."
        npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
        npm install @reduxjs/toolkit react-redux
        npm install react-native-vector-icons react-native-safe-area-context
        npm install react-native-screens @react-native-async-storage/async-storage
        npm install react-native-gesture-handler react-native-reanimated
        
        cd ..
    else
        print_status "React Native project already exists, skipping creation..."
    fi
    
    cd ..
    print_success "Mobile app setup completed!"
}

# Setup Next.js web app
setup_web() {
    print_status "Setting up Next.js web app..."
    
    cd web-app
    
    # Check if Next.js project already exists
    if [ ! -d "synvoy-web" ]; then
        print_status "Creating Next.js project..."
        npx create-next-app@latest synvoy-web --typescript --tailwind --eslint
        
        cd synvoy-web
        
        print_status "Installing web app dependencies..."
        npm install @reduxjs/toolkit react-redux axios
        npm install react-hook-form @headlessui/react @heroicons/react
        npm install recharts tailwind-merge
        
        cd ..
    else
        print_status "Next.js project already exists, skipping creation..."
    fi
    
    cd ..
    print_success "Web app setup completed!"
}

# Main setup function
main() {
    print_status "Starting Synvoy development environment setup..."
    
    # Check prerequisites
    check_prerequisites
    
    # Setup backend
    setup_backend
    
    # Setup mobile app
    setup_mobile
    
    # Setup web app
    setup_web
    
    print_success "🎉 Synvoy development environment setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env with your database credentials"
    echo "2. Start the backend: cd backend && python main.py"
    echo "3. Start the mobile app: cd mobile-app/SynvoyMobile && npm run android"
    echo "4. Start the web app: cd web-app/synvoy-web && npm run dev"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main 