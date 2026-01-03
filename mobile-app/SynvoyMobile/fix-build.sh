#!/bin/bash

# Fix Android build SIGSEGV error
# This script cleans caches and rebuilds the project

echo "🧹 Cleaning caches and build artifacts..."

# Clean Metro bundler cache
echo "Cleaning Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
npx react-native start --reset-cache &
METRO_PID=$!
sleep 2
kill $METRO_PID 2>/dev/null || true

# Clean watchman
echo "Cleaning Watchman..."
watchman watch-del-all 2>/dev/null || true

# Clean node_modules and reinstall
echo "Cleaning node_modules..."
rm -rf node_modules
rm -rf package-lock.json
npm cache clean --force

# Reinstall dependencies
echo "Reinstalling dependencies..."
npm install

# Clean Android build
echo "Cleaning Android build..."
cd android
./gradlew clean
cd ..

# Clean Gradle cache
echo "Cleaning Gradle cache..."
rm -rf ~/.gradle/caches/ 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "Now try building again:"
echo "cd android && ./gradlew assembleRelease"



