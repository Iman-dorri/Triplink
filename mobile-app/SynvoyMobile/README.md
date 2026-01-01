# Synvoy Mobile App

React Native mobile application for the Synvoy Smart Travel & Shopping Platform.

## Features

- ✈️ **Trip Management** - Create, view, and manage your travel plans
- 💰 **Price Alerts** - Track prices for flights, hotels, and travel items
- 🛍️ **Shopping List** - Manage your travel shopping list with price tracking
- 👥 **Social Connections** - Connect with friends and plan trips together
- 📱 **Cross-Platform** - Works on both Android and iOS

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- React Native CLI

## Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS (macOS only):
```bash
cd ios && pod install && cd ..
```

3. Link native dependencies:
```bash
# For vector icons
npx react-native-asset
```

## Running the App

### Android
```bash
npm run android
```

### iOS (macOS only)
```bash
npm run ios
```

### Start Metro Bundler
```bash
npm start
```

## Project Structure

```
SynvoyMobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── auth/        # Authentication screens
│   │   └── main/        # Main app screens
│   ├── components/      # Reusable UI components
│   ├── navigation/      # Navigation configuration
│   ├── store/           # Redux store and slices
│   ├── services/        # API services
│   ├── theme/           # Theme and styling
│   └── utils/           # Utility functions
├── App.tsx              # Main app component
└── index.js             # Entry point
```

## Theme

The app uses a theme matching the web application:
- **Primary Colors**: Blue (#3b82f6) to Cyan (#06b6d4) gradients
- **Accent Colors**: Teal, Emerald, Purple, Pink, Orange
- **Typography**: Inter font family
- **Design**: Modern, clean, professional with smooth animations

## API Configuration

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api' 
  : 'https://www.synvoy.com/api';
```

## Development

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

### State Management
- Redux Toolkit for global state
- AsyncStorage for local persistence

### Navigation
- React Navigation for screen navigation
- Bottom tabs for main app navigation
- Stack navigation for auth flow

## Building for Production

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
```bash
cd ios
xcodebuild -workspace SynvoyMobile.xcworkspace -scheme SynvoyMobile -configuration Release
```

## Troubleshooting

### Metro bundler issues
```bash
npm start -- --reset-cache
```

### Android build issues
```bash
cd android
./gradlew clean
```

### iOS build issues
```bash
cd ios
pod deintegrate
pod install
```

## License

MIT License








