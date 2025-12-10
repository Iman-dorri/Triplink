# Synvoy - Smart Travel & Shopping Platform

A comprehensive platform that combines travel planning with smart shopping features, helping users plan trips and find the best deals on travel-related items.

## 🚀 Project Overview

Synvoy is a multi-platform application that helps users:
- **Plan trips** with detailed itineraries and destination management
- **Set price alerts** for flights, hotels, and travel items
- **Manage shopping lists** with price tracking and comparison
- **Connect with friends** for group travel planning
- **Track expenses** and stay within budget

## 🏗️ Architecture

The project consists of three main components:

### 1. **Backend API** (Python/FastAPI)
- **Location**: `backend/`
- **Technology**: FastAPI, SQLAlchemy, PostgreSQL
- **Features**: RESTful API, JWT authentication, database management

### 2. **Mobile App** (React Native)
- **Location**: `mobile-app/`
- **Technology**: React Native, TypeScript, Redux Toolkit
- **Features**: Cross-platform mobile app for iOS and Android

### 3. **Web App** (Next.js)
- **Location**: `web-app/`
- **Technology**: Next.js, TypeScript, Tailwind CSS
- **Features**: Responsive web application with modern UI

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Primary database
- **JWT** - Authentication and authorization
- **Pydantic** - Data validation

### Frontend
- **React Native** - Mobile app development
- **Next.js** - Web app framework
- **TypeScript** - Type-safe JavaScript
- **Redux Toolkit** - State management
- **Tailwind CSS** - Utility-first CSS framework

## 📁 Project Structure

```
Synvoy/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── controllers/    # API route handlers
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── tests/              # Test files
│   ├── main.py             # Application entry point
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── mobile-app/             # React Native mobile app
│   ├── SynvoyMobile/     # React Native project
│   └── README.md          # Mobile app documentation
├── web-app/                # Next.js web application
│   ├── synvoy-web/       # Next.js project
│   └── README.md          # Web app documentation
├── Document/               # Project documentation
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL 14+** (database)
- **Android Studio** (for mobile development)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp env.example .env
# Edit .env with your database credentials

# Run the application
python main.py
```

### 2. Mobile App Setup

```bash
cd mobile-app

# Create React Native project
npx react-native@latest init SynvoyMobile --template react-native-template-typescript

# Install dependencies
cd SynvoyMobile
npm install @react-navigation/native @react-navigation/stack @reduxjs/toolkit react-redux

# Run on Android
npm run android
```

### 3. Web App Setup

```bash
cd web-app

# Create Next.js project
npx create-next-app@latest synvoy-web --typescript --tailwind --eslint

# Install dependencies
cd synvoy-web
npm install @reduxjs/toolkit react-redux axios

# Run development server
npm run dev
```

## 🔧 Development

### Backend Development

- **API Documentation**: Available at `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`
- **Database**: PostgreSQL with SQLAlchemy ORM

### Mobile Development

- **Metro Bundler**: `npm start`
- **Android**: `npm run android`
- **iOS**: `npm run ios` (macOS only)

### Web Development

- **Development Server**: `http://localhost:3000`
- **Hot Reload**: Enabled by default
- **TypeScript**: Full type safety

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
# Mobile app
cd mobile-app/SynvoyMobile
npm test

# Web app
cd web-app/synvoy-web
npm test
```

## 📚 Documentation

- **Backend API**: Check `backend/README.md`
- **Mobile App**: Check `mobile-app/README.md`
- **Web App**: Check `web-app/README.md`
- **Project Setup**: Check `Document/Project_Setup_Guide.md`

## 🎯 Next Steps

1. **Complete Backend API**
   - Implement all CRUD operations
   - Add comprehensive testing
   - Set up database migrations

2. **Build Mobile App**
   - Create authentication screens
   - Implement trip management
   - Add price alert features

3. **Develop Web App**
   - Build responsive dashboard
   - Create trip planning interface
   - Implement shopping management

4. **Integration & Testing**
   - Connect all components
   - End-to-end testing
   - Performance optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions and support:
- Check the documentation in each component
- Review the setup guides
- Open an issue for bugs or feature requests

---

**Happy coding! 🎉** 