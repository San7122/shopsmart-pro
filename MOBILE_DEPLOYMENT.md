# ShopSmart Pro - Mobile App Deployment Guide

This guide covers how to build and deploy native mobile apps for both iOS and Android platforms from the existing React Native codebase.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Building for iOS](#building-for-ios)
4. [Building for Android](#building-for-android)
5. [App Store Deployment](#app-store-deployment)
6. [Free Deployment Options](#free-deployment-options)
7. [Testing](#testing)

## Prerequisites

### For Both Platforms:
- Node.js v18 or higher
- npm or yarn
- React Native CLI tools

### For iOS Development:
- macOS with Xcode (minimum version 12.0)
- Apple Developer Account (required for App Store distribution)

### For Android Development:
- Android Studio
- Android SDK
- Java Development Kit (JDK)

## Development Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

## Building for iOS

### 1. Development Build (Testing)
```bash
npm run ios
```

### 2. Production Build (App Store)
```bash
# Open the iOS project in Xcode
open ios/ShopSmartPro.xcworkspace

# In Xcode:
# 1. Select your development team in project settings
# 2. Update bundle identifier
# 3. Archive: Product > Archive
# 4. Distribute App: Upload to App Store Connect
```

### 3. iOS Configuration Updates
Update these files in `mobile/ios/ShopSmartPro/Info.plist`:
```xml
<key>CFBundleDisplayName</key>
<string>ShopSmart Pro</string>
<key>CFBundleName</key>
<string>ShopSmart Pro</string>
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

## Building for Android

### 1. Development Build (Testing)
```bash
npm run android
```

### 2. Production Build (Google Play Store)
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Or generate AAB (Android App Bundle - preferred for Play Store)
./gradlew bundleRelease
```

### 3. Android Configuration Updates
Update these files in `mobile/android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.shopsmartpro"  // Change this
        versionCode 1
        versionName "1.0.0"
    }
}
```

And update `mobile/android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourcompany.shopsmartpro">  <!-- Change this -->
    
    <application
        android:label="ShopSmart Pro"  <!-- Change this -->
        android:name=".MainApplication"
        android:icon="@mipmap/ic_launcher">
```

## App Store Deployment

### For iOS (App Store):
1. Join the Apple Developer Program ($99/year)
2. Create app record in App Store Connect
3. Prepare screenshots, app description, and metadata
4. Archive and upload through Xcode
5. Submit for review

### For Android (Google Play Store):
1. Create Google Play Console developer account ($25 one-time fee)
2. Prepare app listing (screenshots, descriptions, etc.)
3. Upload AAB file to Play Console
4. Configure app content rating
5. Submit for review

## Free Deployment Options

### Expo (Recommended for Free Distribution)
Expo allows you to build and distribute apps without needing Apple/Google developer accounts:

1. Install Expo CLI:
```bash
npm install -g @expo/cli
```

2. Convert project to Expo (if not already):
```bash
npx expo install --fix
```

3. Create an Expo account at [expo.dev](https://expo.dev)

4. Build and distribute:
```bash
# Build for both platforms
eas build --platform all

# Or build for specific platform
eas build --platform ios
eas build --platform android
```

5. Publish to Expo Go for immediate sharing:
```bash
eas submit --platform ios
eas submit --platform android
```

### Expo Build Process:
1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Initialize EAS in your project:
```bash
eas build:configure
```

3. Create an `eas.json` configuration file:
```json
{
  "cli": {
    "version": ">= 2.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

4. Build and distribute:
```bash
# For development/testing
eas build --profile development --platform all

# For production
eas build --profile production --platform all
```

## Using Expo for Free Distribution

With Expo, you can distribute your app for free without paying Apple or Google fees:

1. **Development Phase**: Use Expo Go app to test your app on devices
2. **Sharing**: Generate QR codes to let others test your app
3. **Production**: Build standalone apps that can be distributed directly

### Advantages of Expo for Free Distribution:
- No Apple Developer Program fees ($99/year)
- No Google Play Console fees ($25 one-time)
- Simplified build process
- Over-the-air updates
- Built-in analytics and crash reporting

### Limitations:
- Some native modules may not be compatible
- App size may be slightly larger
- Limited access to certain device features

## Testing

### Local Testing
```bash
# For iOS simulator
npm run ios

# For Android emulator
npm run android

# For web (during development)
npm start
```

### Device Testing
1. Connect physical device via USB
2. Enable developer mode on the device
3. Run:
```bash
# iOS
npm run ios

# Android
npm run android
```

## API Configuration for Mobile

The mobile app is already configured to work with your deployed backend. Update the API URL in `mobile/src/services/api.js`:

```javascript
const BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000/api'  // Android Emulator
  : 'https://your-deployed-backend-url/api';  // Production
```

## Environment Variables for Mobile

Create a `.env` file in the mobile directory if needed:
```bash
# Mobile environment variables
MOBILE_API_URL=https://your-deployed-backend-url
MOBILE_APP_NAME=ShopSmart Pro
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Make sure all dependencies are installed and environment is set up correctly
2. **API connectivity**: Ensure your deployed backend allows mobile origins
3. **Permissions**: Check if camera, storage permissions are properly configured

### For iOS:
- Clean build folder: `xcodebuild clean`
- Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

### For Android:
- Clean project: `cd android && ./gradlew clean`
- Clear cache: `npx react-native start --reset-cache`

## Sharing Your Mobile App

### With Expo (Free Method):
1. Build your app using EAS
2. Share the QR code or link with users
3. Users scan the QR code using Expo Go app
4. App installs and runs instantly

### Direct APK/IPA Distribution:
1. Build production APK/AIPA files
2. Host them on your website
3. Users download and install directly
4. Note: iOS requires TestFlight or enterprise distribution for non-App Store distribution

## Recommended Path for Free Distribution

1. Use Expo for the simplest free distribution
2. Deploy your backend to a free hosting service (Render, Railway, etc.)
3. Build mobile app using EAS
4. Share the QR code with users
5. Users can run your app using the Expo Go app

This approach allows you to have a fully functioning mobile app for both iOS and Android without any paid developer accounts!