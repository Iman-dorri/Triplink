# Synvoy Mobile App

React Native mobile application for the Synvoy Smart Travel & Shopping Platform.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- React Native CLI

## Setup Instructions

### 1. Install React Native CLI

```bash
npm install -g @react-native-community/cli
```

### 2. Create React Native Project

```bash
npx react-native@latest init SynvoyMobile --template react-native-template-typescript
cd SynvoyMobile
```

### 3. Install Dependencies

```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install @reduxjs/toolkit react-redux
npm install react-native-vector-icons
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-native-async-storage/async-storage
npm install react-native-gesture-handler
npm install react-native-reanimated
```

### 4. Android Setup

1. Open Android Studio
2. Open the `android` folder from your React Native project
3. Sync Gradle files
4. Run the app on an emulator or device

### 5. iOS Setup (macOS only)

1. Install iOS dependencies: `cd ios && pod install`
2. Open the `.xcworkspace` file in Xcode
3. Run the app on a simulator or device

## Project Structure

```
SynvoyMobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── store/          # Redux store and slices
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   └── assets/         # Images, fonts, etc.
├── android/            # Android-specific code
├── ios/                # iOS-specific code
└── App.tsx            # Main app component
```

## Development

### Start Metro Bundler

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

## Features to Implement

1. **Authentication**
   - Login/Register screens
   - JWT token management
   - User profile

2. **Trip Management**
   - Create/edit trips
   - Add destinations
   - Trip timeline

3. **Price Alerts**
   - Set price alerts
   - Notification management
   - Price tracking

4. **Shopping List**
   - Add shopping items
   - Price comparison
   - Wishlist management

5. **Social Features**
   - Connect with friends
   - Share trips
   - Group planning 