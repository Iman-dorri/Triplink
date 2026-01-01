#!/bin/bash

# Script to properly initialize React Native project structure
# This will create the native Android/iOS folders if they don't exist

echo "🚀 Setting up React Native project structure..."

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "⚠️  Android folder not found. Creating React Native project structure..."
    
    # Create a temporary React Native project to copy native folders
    cd ..
    TEMP_PROJECT="SynvoyMobile-temp"
    
    # Initialize a new React Native project
    npx @react-native-community/cli@latest init $TEMP_PROJECT --skip-install --template react-native-template-typescript
    
    # Copy android and ios folders
    if [ -d "$TEMP_PROJECT/android" ]; then
        cp -r $TEMP_PROJECT/android SynvoyMobile/
        echo "✅ Android folder created"
    fi
    
    if [ -d "$TEMP_PROJECT/ios" ]; then
        cp -r $TEMP_PROJECT/ios SynvoyMobile/
        echo "✅ iOS folder created"
    fi
    
    # Copy other necessary files
    if [ -f "$TEMP_PROJECT/.gitignore" ]; then
        cp $TEMP_PROJECT/.gitignore SynvoyMobile/
    fi
    
    if [ -f "$TEMP_PROJECT/.watchmanconfig" ]; then
        cp $TEMP_PROJECT/.watchmanconfig SynvoyMobile/
    fi
    
    # Clean up temp project
    rm -rf $TEMP_PROJECT
    
    cd SynvoyMobile
    echo "✅ Project structure initialized"
else
    echo "✅ Android folder already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. For Android: npm run android"
echo "2. For iOS: cd ios && pod install && cd .. && npm run ios"








