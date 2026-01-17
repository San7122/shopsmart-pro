# ShopSmart Pro - Complete Deployment Guide

Welcome to ShopSmart Pro - a comprehensive retail management solution with web and mobile applications. This guide will walk you through deploying both the web application and mobile apps for iOS and Android.

## 🚀 Features

- **Web Application**: Full-featured dashboard for inventory, customers, transactions, and analytics
- **Mobile Application**: Native iOS and Android app for on-the-go management
- **Payment Integration**: Razorpay for seamless transactions
- **Real-time Analytics**: Comprehensive business insights
- **Multi-platform**: Works on web, iOS, and Android

## 📋 Table of Contents

1. [Web Application Deployment](#web-application-deployment)
2. [Mobile Application Deployment](#mobile-application-deployment)
3. [Free Deployment Options](#free-deployment-options)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)

## Web Application Deployment

### Option 1: Render.com (Recommended for Free Deployment)

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Fork this repository to your GitHub account
3. Create a new Web Service on Render
4. Connect to your forked repository
5. Configure the build and start commands:

```
Build Command: npm run install:all && cd server && npm install
Start Command: cd server && npm start
```

6. Add the required environment variables in Render dashboard
7. Deploy!

### Option 2: Railway.app (Alternative Free Option)

1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Import the project
4. Railway will automatically detect Node.js and run the appropriate commands
5. Add environment variables in the Railway dashboard
6. Deploy!

### Option 3: Docker (Self-Hosting)

```bash
# Navigate to project directory
cd shopsmart-pro

# Create environment file
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start the application
docker-compose up -d
```

## Mobile Application Deployment

### Expo (Completely Free - No Developer Fees!)

This is the best option for free deployment without paying Apple ($99/year) or Google ($25 one-time) fees.

**Steps:**
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Expo CLI:
   ```bash
   npm install -g @expo/cli
   ```

4. Initialize EAS (Expo Application Services):
   ```bash
   eas build:configure
   ```

5. Create an account at [expo.dev](https://expo.dev)

6. Build for both platforms:
   ```bash
   eas build --platform all
   ```

7. Share your app:
   - Users can scan the QR code with the Expo Go app
   - No app store submission required
   - Instant distribution

### Native App Stores (Paid Options)

If you prefer native app stores:

**For iOS App Store:**
- Join Apple Developer Program ($99/year)
- Use Xcode to archive and submit

**For Google Play Store:**
- Join Google Play Console ($25 one-time fee)
- Upload APK or AAB file

## Free Deployment Options

### 1. Web App (Free Tier)
- **Render.com**: 1 free web service (1GB RAM, 100GB/month bandwidth)
- **Railway.app**: 500 hours/month free
- Both support custom domains

### 2. Mobile App (Free Distribution)
- **Expo**: Completely free for development and distribution
- Users download Expo Go app and scan QR code
- No Apple/Google developer fees required

### 3. Database (Free Tier)
- **MongoDB Atlas**: Free tier with 512MB storage
- **Redis**: Many providers offer free tiers

## Environment Configuration

### Web Application Environment Variables (All Cloud-Based - No Local Installation Needed!)

These services run in the cloud, not on your laptop. Create `server/.env` with these variables:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopsmart-pro

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Internal API Key (Required for n8n integration)
SHOPSMART_INTERNAL_API_KEY=your-very-secure-internal-api-key

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-api-domain.com
```

### Mobile Application Configuration

Update `mobile/src/services/api.js` with your deployed backend URL:

```javascript
const BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000/api'  // Android Emulator
  : 'https://your-deployed-backend/api';  // Production
```

## Complete Deployment Steps (Free Option)

### Step 1: Deploy Web Application
1. Choose Render.com or Railway.app
2. Connect your GitHub repository
3. Add environment variables
4. Deploy and note the URL

### Step 2: Configure Mobile App
1. Update the API URL in `mobile/src/services/api.js` to your deployed backend URL
2. Commit and push changes

### Step 3: Deploy Mobile Application (Free)
1. Navigate to mobile directory: `cd mobile`
2. Install dependencies: `npm install`
3. Install Expo CLI: `npm install -g @expo/cli`
4. Build app: `eas build --platform all`
5. Share QR code with users

### Step 4: Share Your Application
- **Web App**: Share the web URL
- **Mobile App**: Users scan QR code with Expo Go app
- **Direct Links**: Both web and mobile are accessible immediately

## No Sleeping Applications

Both Render.com and Railway.app offer features to keep your applications active:

- **Render.com**: Paid plans offer no-sleep features
- **Railway.app**: Higher usage tiers reduce sleep frequency
- **Self-hosting**: No sleep with dedicated servers

## Troubleshooting

### Web Application Issues:
- Check environment variables are properly set
- Verify database connection string
- Ensure payment gateway credentials are correct
- Check CORS settings match your domain

### Mobile Application Issues:
- Confirm API endpoint is accessible
- Verify internet connectivity
- Check if firewall blocks the API calls

### Common Solutions:
1. Clear browser cache and mobile app cache
2. Verify all environment variables are set
3. Check that your backend is accessible from mobile devices
4. Ensure SSL certificates are properly configured for HTTPS

## Support

- Documentation: Check the DEPLOYMENT.md and MOBILE_DEPLOYMENT.md files
- Issues: Report in the GitHub repository
- Community: Reach out through your deployment platform's support

## Next Steps

1. Deploy your web application using one of the free options
2. Configure your environment variables
3. Build and distribute your mobile application via Expo
4. Start managing your retail business with ShopSmart Pro!

---

**🎉 Congratulations!** You now have everything needed to deploy ShopSmart Pro completely free with no sleeping, and with mobile apps for both iOS and Android. The application is production-ready and includes all the features needed for retail management.