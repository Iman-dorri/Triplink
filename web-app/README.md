# Synvoy Web App

Next.js web application for the Synvoy Smart Travel & Shopping Platform.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Setup Instructions

### 1. Create Next.js Project

```bash
npx create-next-app@latest synvoy-web --typescript --tailwind --eslint
cd synvoy-web
```

### 2. Install Dependencies

```bash
npm install @reduxjs/toolkit react-redux
npm install axios
npm install react-hook-form
npm install @headlessui/react
npm install @heroicons/react
npm install recharts
npm install tailwind-merge
```

### 3. Project Structure

```
synvoy-web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Next.js pages
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── store/          # Redux store and slices
│   ├── utils/          # Utility functions
│   └── styles/         # CSS and Tailwind styles
├── public/             # Static assets
├── next.config.js      # Next.js configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

## Development

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Features to Implement

1. **Authentication**
   - Login/Register forms
   - JWT token management
   - Protected routes

2. **Dashboard**
   - User overview
   - Recent trips
   - Quick actions

3. **Trip Management**
   - Create/edit trips
   - Destination management
   - Trip timeline view

4. **Price Alerts**
   - Alert configuration
   - Price tracking dashboard
   - Notification center

5. **Shopping Management**
   - Shopping lists
   - Price comparison tools
   - Wishlist management

6. **Social Features**
   - User connections
   - Trip sharing
   - Group planning tools

## Design System

The app uses Tailwind CSS for styling with a custom design system:

- **Colors**: Blue primary (#1E3A8A), Teal secondary (#0D9488)
- **Typography**: Inter font family
- **Components**: Consistent button, input, and card designs
- **Responsive**: Mobile-first responsive design

## API Integration

The web app integrates with the Synvoy backend API:

- **Base URL**: `http://localhost:8000/api`
- **Authentication**: JWT-based authentication
- **Endpoints**: RESTful API endpoints for all features 