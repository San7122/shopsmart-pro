# ShopSmart Pro - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Platform-Specific Instructions](#platform-specific-instructions)
5. [Post-Deployment Steps](#post-deployment-steps)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Backend (Node.js Server)**:
  - Node.js v18 or higher (only needed for local development)
  - MongoDB (cloud instance - MongoDB Atlas recommended)
  - Redis (optional, for enhanced rate limiting)

- **Frontend (React Client)**:
  - Node.js v18 or higher (only needed for local development)
  - npm or yarn package manager

### External Services Required (ALL RUN IN THE CLOUD - NO LOCAL INSTALLATION NEEDED!)
- **Database**: MongoDB Atlas (cloud database with free tier)
- **Payment Gateway**: Razorpay (sign up at razorpay.com for API keys)
- **Cloud Storage**: AWS S3, Google Cloud Storage, or similar (for file uploads)
- **Email Service**: SendGrid or similar (for notifications)
- **SMS Service**: Twilio or similar (for customer notifications)

**Important**: You do NOT need to install MongoDB, Razorpay, or any other services on your laptop. Everything runs in the cloud when deployed!

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd shopsmart-pro
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root
cd ..
```

### 3. Configure Environment Variables

Copy the `.env.example` file and update the values:

```bash
# Backend environment variables
cp server/.env.example server/.env
```

Key environment variables to configure:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopsmart-pro

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloud Storage (AWS S3 Example)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your-bucket-name
AWS_REGION=your-aws-region

# Email Service (SendGrid Example)
SENDGRID_API_KEY=your_sendgrid_api_key

# SMS Service (Twilio Example)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Internal API Key (Required for n8n integration)
SHOPSMART_INTERNAL_API_KEY=your-very-secure-internal-api-key

# Redis (Optional, for enhanced rate limiting)
REDIS_URL=redis://username:password@host:port

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

## Deployment Options

### Option 1: Deploy to Render.com (Recommended for beginners)

#### Backend Deployment Steps:
1. Create a free account at [render.com](https://render.com)
2. Fork this repository to your GitHub account
3. Create a new Web Service on Render
4. Connect to your forked repository
5. Configure the build and start commands:

```
Build Command: npm run install:all && cd server && npm install
Start Command: cd server && npm start
```

6. Add the required environment variables in Render dashboard
7. Set the environment type to "Web Service"
8. Deploy!

#### Frontend Deployment Steps:
1. Create a new Static Site on Render
2. Connect to your repository
3. Set the publish directory to `client/dist` (after build)
4. Build command: `cd client && npm install && npm run build`
5. Add any required environment variables
6. Deploy!

### Option 2: Deploy to Railway.app

1. Create a free account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Import the project
4. Railway will automatically detect Node.js and run the appropriate commands
5. Add environment variables in the Railway dashboard
6. Deploy!

### Option 3: Deploy to Heroku

1. Create a free account at [heroku.com](https://heroku.com)
2. Install Heroku CLI: `brew tap heroku/brew && brew install heroku`
3. Login: `heroku login`
4. Create app: `heroku create your-app-name`
5. Add buildpacks:
   ```bash
   heroku buildpacks:add heroku/nodejs
   ```
6. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI=your_mongo_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   # ... add other required variables
   ```
7. Deploy: `git push heroku main`

### Option 4: Self-Hosting with Docker

#### Prerequisites:
- Docker and Docker Compose installed

#### Steps:
1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

2. Create a `Dockerfile`:

```Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

WORKDIR /app/server
RUN npm install

WORKDIR /app

EXPOSE 5000

CMD ["npm", "start"]
```

3. Build and run:
```bash
docker-compose up -d
```

## Platform-Specific Instructions

### Render.com Deployment (Detailed)

**Note for Mobile Apps**: When deploying to Render.com, make sure to update the mobile app's API endpoint to point to your Render deployment URL. Update the `BASE_URL` in `mobile/src/services/api.js` to use your Render deployment URL.

1. **Sign up and create services:**
   - Go to [render.com](https://render.com)
   - Sign up using GitHub
   - Click "New +" and select "Web Service"

2. **Configure Backend:**
   - Connect to your GitHub repo
   - Branch: main
   - Runtime: Node
   - Build Command: `npm run install:all && cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: Production
   - Region: Choose closest to your users

3. **Add Environment Variables in Render Dashboard:**
   - MONGODB_URI
   - JWT_SECRET
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - SHOPSMART_INTERNAL_API_KEY
   - And other required variables

4. **Configure Frontend (Separate Service):**
   - Create another Web Service for the frontend
   - Build Command: `cd client && npm install && npm run build`
   - Start Command: `cd client && npx serve -s build`
   - Environment variables as needed

### Railway.app Deployment (Detailed)

1. **Connect GitHub:**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select your repository

2. **Configure Variables:**
   - Go to "Variables" tab
   - Add all required environment variables

3. **Deploy:**
   - Railway will automatically build and deploy
   - Monitor the deployment logs

### Heroku Deployment (Detailed)

1. **Install CLI:**
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login and Create App:**
   ```bash
   heroku login
   heroku create your-shopsmart-app-name
   ```

3. **Configure Variables:**
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://..."
   heroku config:set JWT_SECRET="your-secret"
   heroku config:set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

## Post-Deployment Steps

### 1. Verify Deployment
- Access your deployed application URL
- Check the health endpoint: `https://your-app-url/api/health`
- Verify database connection is working

### 2. Configure Domain (Optional)
- Purchase a custom domain
- Point DNS records to your hosting provider
- Configure SSL certificate (most platforms provide free SSL)

### 3. Set Up Monitoring
- Configure error tracking (consider Sentry)
- Set up performance monitoring
- Configure uptime monitoring

### 4. Security Hardening
- Enable HTTPS/SSL
- Configure proper CORS settings
- Set up rate limiting appropriately
- Regular security audits

### 5. Backup Strategy
- Set up automated database backups
- Schedule regular data exports
- Test backup restoration procedures

## Troubleshooting

### Common Issues:

**1. Environment Variables Not Loading:**
- Ensure all required variables are set in the deployment platform
- Check for typos in variable names
- Verify NODE_ENV is set to 'production'

**2. Database Connection Issues:**
- Verify MongoDB URI is correct
- Check if MongoDB cluster accepts connections from your hosting platform
- Ensure network access is configured properly

**3. Build Failures:**
- Check for missing dependencies in package.json
- Verify build commands are correct
- Ensure adequate memory allocation

**4. CORS Issues:**
- Verify FRONTEND_URL is correctly set
- Check if the deployed frontend URL matches the CORS configuration

**5. Payment Gateway Issues:**
- Ensure Razorpay keys are correctly configured
- Verify webhook URLs are accessible
- Check if payment gateway is configured for production vs test mode

### Getting Help:
- Check application logs in your deployment platform
- Enable detailed logging temporarily to debug issues
- Test API endpoints individually using tools like Postman

## Scaling Recommendations

As your application grows, consider:

1. **Database Scaling:**
   - Upgrade to larger MongoDB cluster
   - Implement database indexing optimization

2. **Application Scaling:**
   - Enable horizontal scaling on your hosting platform
   - Implement Redis for caching
   - Add CDN for static assets

3. **Performance Optimization:**
   - Implement API response caching
   - Optimize database queries
   - Add monitoring and alerting

## Support and Maintenance

- Regular security updates
- Database maintenance
- Performance monitoring
- Backup verification
- User support setup

## Mobile App Deployment

ShopSmart Pro includes a React Native mobile application for both iOS and Android. The mobile app is located in the `/mobile` directory.

### Mobile Deployment Options:

1. **Expo (Recommended for free distribution)**:
   - Allows free distribution without Apple/Google developer fees
   - Simple build process using EAS
   - Over-the-air updates
   
2. **Native Stores**:
   - iOS: Apple App Store ($99/year developer program)
   - Android: Google Play Store ($25 one-time fee)

### Mobile App Setup:

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
   
2. Install dependencies:
   ```bash
   npm install
   ```

3. For native builds, follow the platform-specific instructions in [MOBILE_DEPLOYMENT.md](MOBILE_DEPLOYMENT.md)

4. For Expo distribution:
   ```bash
   # Install Expo CLI
   npm install -g @expo/cli
   
   # Build for both platforms
   eas build --platform all
   ```

The mobile app is already configured to connect to your deployed backend API.

---

**Important Security Notes:**
- Never expose sensitive environment variables in client-side code
- Use strong, unique passwords for all services
- Regularly rotate API keys and secrets
- Keep dependencies updated
- Monitor logs for suspicious activity