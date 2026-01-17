# 🆓 ShopSmart Pro - 100% FREE Deployment Guide

## Overview
This guide helps you deploy ShopSmart Pro completely FREE. Perfect for MVP and initial customer acquisition.

---

## 📊 Free Services Comparison

| Service | Provider | Free Tier Limits | Good For |
|---------|----------|------------------|----------|
| Backend | **Render** | 750 hrs/mo, sleeps after 15min | MVP |
| Backend | **Railway** | $5 credit/mo (~500 hrs) | Better uptime |
| Frontend | **Vercel** | Unlimited, 100GB bandwidth | Production |
| Frontend | **Netlify** | 100GB bandwidth, 300 build min | Production |
| Database | **MongoDB Atlas** | 512MB, shared cluster | Up to 1000 users |
| Cache | **Upstash** | 10K commands/day | Light caching |
| n8n | **n8n.cloud** | 5 active workflows | Automation |
| Email | **Resend** | 100 emails/day | Transactional |
| SMS | **Twilio** | $15.50 trial credit | ~150 SMS |

---

## 🚀 Step-by-Step FREE Deployment

### Step 1: MongoDB Atlas (Free Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up with Google/Email
3. Create FREE cluster:
   - Choose **M0 Sandbox** (FREE)
   - Region: Mumbai (ap-south-1) for India
   - Cluster name: `shopsmart-cluster`

4. Setup access:
   ```
   Database Access → Add New User
   Username: shopsmart_user
   Password: [generate strong password]
   Role: Read and write to any database
   ```

5. Network Access:
   ```
   Network Access → Add IP Address
   Select: "Allow Access from Anywhere" (0.0.0.0/0)
   ```

6. Get connection string:
   ```
   Clusters → Connect → Connect your application
   Copy the URI:
   mongodb+srv://shopsmart_user:<password>@shopsmart-cluster.xxxxx.mongodb.net/shopsmart-pro?retryWrites=true&w=majority
   ```

---

### Step 2: Deploy Backend on Render (FREE)

1. Go to [render.com](https://render.com) and sign up

2. Connect GitHub:
   - Push your code to GitHub first
   - Or use "Deploy from Git URL"

3. Create New Web Service:
   ```
   New → Web Service
   Name: shopsmart-api
   Region: Singapore (closest to India)
   Branch: main
   Root Directory: server
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: FREE
   ```

4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://shopsmart_user:xxx@cluster.mongodb.net/shopsmart-pro
   JWT_SECRET=your-super-secret-key-change-this
   JWT_EXPIRE=30d
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. Deploy! Your API will be at: `https://shopsmart-api.onrender.com`

> ⚠️ **Note**: Free Render services sleep after 15 min of inactivity. First request takes ~30 seconds to wake up.

---

### Step 3: Deploy Frontend on Vercel (FREE)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub

2. Import Project:
   ```
   New Project → Import from GitHub
   Select your repository
   Framework: Vite (or Create React App)
   Root Directory: client
   ```

3. Add Environment Variables:
   ```
   VITE_API_URL=https://shopsmart-api.onrender.com/api
   ```

4. Deploy! Your app will be at: `https://shopsmart-pro.vercel.app`

---

### Step 4: Upstash Redis (FREE Cache)

1. Go to [upstash.com](https://upstash.com)
2. Create FREE Redis database:
   ```
   Region: ap-south-1-1 (Mumbai)
   Name: shopsmart-cache
   ```

3. Get credentials:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   ```

4. Add to Render environment variables

---

### Step 5: n8n Cloud (FREE Automation)

1. Go to [n8n.cloud](https://n8n.cloud)
2. Sign up for FREE plan (5 workflows)
3. Import workflows from `/n8n/workflows/`
4. Configure credentials:
   - HTTP Request node → Your API URL
   - WhatsApp → Twilio credentials

---

### Step 6: Twilio (FREE Trial for SMS)

1. Go to [twilio.com](https://www.twilio.com)
2. Sign up → Get $15.50 FREE credit
3. Get credentials:
   ```
   Account SID: ACxxxxxxxxx
   Auth Token: xxxxxxxxx
   Phone Number: +1xxxxxxxxx (trial number)
   ```

> 💡 **Tip**: Trial accounts can only send to verified numbers. Add your test numbers first.

---

### Step 7: Resend (FREE Email)

1. Go to [resend.com](https://resend.com)
2. Sign up → 100 emails/day FREE
3. Add domain or use their test domain
4. Get API key:
   ```
   RESEND_API_KEY=re_xxxxxxxxx
   ```

---

### Step 8: Free Domain (Optional)

**Option A: Use Vercel subdomain (Recommended)**
- Your app: `shopsmart-pro.vercel.app`
- Your API: `shopsmart-api.onrender.com`

**Option B: Free domain from Freenom**
1. Go to [freenom.com](https://freenom.com)
2. Get free domain: `.tk`, `.ml`, `.ga`, `.cf`
3. Point to Vercel/Render

**Option C: Cheap domain (~₹100/year)**
- Namecheap `.xyz` domains: $1/year
- GoDaddy `.in` domains: ₹99/year

---

## 📁 Updated .env for FREE Deployment

```env
# ============================================
# SHOPSMART PRO - FREE DEPLOYMENT CONFIG
# ============================================

# Server
NODE_ENV=production
PORT=5000

# MongoDB Atlas FREE (M0)
MONGODB_URI=mongodb+srv://shopsmart_user:YOUR_PASSWORD@shopsmart-cluster.xxxxx.mongodb.net/shopsmart-pro?retryWrites=true&w=majority

# JWT
JWT_SECRET=change-this-to-a-very-long-random-string-at-least-32-chars
JWT_EXPIRE=30d

# Frontend URL (Vercel)
FRONTEND_URL=https://shopsmart-pro.vercel.app

# Upstash Redis (FREE)
REDIS_URL=redis://default:YOUR_PASSWORD@xxx.upstash.io:6379
# OR use REST API
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Twilio (Trial)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxx

# Resend Email (FREE)
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=noreply@resend.dev

# n8n Webhook URL
N8N_WEBHOOK_URL=https://xxx.app.n8n.cloud/webhook/

# Disable features not needed in free tier
ENABLE_REDIS_CACHE=false
ENABLE_RATE_LIMIT_REDIS=false
```

---

## 🔧 Code Changes for FREE Tier

### 1. Make Redis Optional

Update `server/middleware/cache.js`:

```javascript
// Check if Redis is available
const REDIS_ENABLED = process.env.ENABLE_REDIS_CACHE === 'true';

let redis = null;

if (REDIS_ENABLED && process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', () => {
    console.warn('Redis not available, using memory cache');
  });
}

// Fallback to in-memory cache
const memoryCache = new Map();

async function getCache(key) {
  if (redis) {
    return JSON.parse(await redis.get(key));
  }
  return memoryCache.get(key);
}

async function setCache(key, value, ttl = 300) {
  if (redis) {
    await redis.setex(key, ttl, JSON.stringify(value));
  } else {
    memoryCache.set(key, value);
    setTimeout(() => memoryCache.delete(key), ttl * 1000);
  }
}
```

### 2. Use Memory Rate Limiting

The default `express-rate-limit` uses memory store, which is fine for single instance.

---

## 📊 FREE Tier Limits & What They Mean

| Service | Limit | What it means |
|---------|-------|---------------|
| **Render** | Sleeps after 15min | First visitor waits 30s |
| **MongoDB** | 512MB | ~50,000 customers |
| **Vercel** | 100GB bandwidth | ~1M page views/mo |
| **Upstash** | 10K commands/day | ~400 cached requests/hr |
| **Resend** | 100 emails/day | 100 notifications/day |
| **Twilio Trial** | $15 credit | ~150 SMS total |

---

## 🚨 When to Upgrade

### Upgrade when you have:

| Metric | Free Limit | Upgrade At |
|--------|------------|------------|
| Daily Users | 50 | 100+ |
| Database Size | 512MB | 400MB used |
| SMS/month | 150 (trial) | Need more |
| Response Time | 30s cold start | Users complaining |

### Recommended First Upgrades:

1. **Render → Railway ($5/mo)** - No cold starts
2. **MongoDB M0 → M2 ($9/mo)** - Better performance
3. **Twilio Trial → PAYG** - Real phone number

---

## ✅ FREE Deployment Checklist

```
□ MongoDB Atlas M0 created
□ Render backend deployed
□ Vercel frontend deployed
□ Environment variables set
□ Test user registration
□ Test customer creation
□ Test transaction
□ Verify SMS (if using)
□ Verify email (if using)
□ Share link with test users!
```

---

## 🎯 Quick Deploy Commands

```bash
# 1. Clone and setup
git clone https://github.com/your-repo/shopsmart-pro.git
cd shopsmart-pro

# 2. Push to GitHub (required for Render/Vercel)
git remote add origin https://github.com/YOUR_USERNAME/shopsmart-pro.git
git push -u origin main

# 3. Then deploy via dashboards:
# - render.com (backend)
# - vercel.com (frontend)
```

---

## 💡 Tips for FREE Tier

1. **Prevent Render Sleep**: Use [UptimeRobot](https://uptimerobot.com) (FREE) to ping your API every 14 minutes

2. **Reduce Database Size**: 
   - Delete old transactions periodically
   - Compress images before storing

3. **Save SMS Credits**:
   - Use WhatsApp API (free with business account)
   - Send emails instead of SMS

4. **Monitor Usage**:
   - MongoDB Atlas shows storage used
   - Render shows hours used
   - Vercel shows bandwidth

---

## 🆘 Troubleshooting

### "Application Error" on Render
- Check logs in Render dashboard
- Verify MONGODB_URI is correct
- Make sure PORT is set to 5000

### "API not responding"
- Service might be sleeping (wait 30s)
- Check if free hours exhausted

### "Database connection failed"
- Whitelist 0.0.0.0/0 in MongoDB Network Access
- Check username/password in connection string

---

## 📞 Support

Need help? 
- Render Docs: docs.render.com
- Vercel Docs: vercel.com/docs
- MongoDB Docs: docs.atlas.mongodb.com

---

**You're ready to launch for ₹0! 🚀**
