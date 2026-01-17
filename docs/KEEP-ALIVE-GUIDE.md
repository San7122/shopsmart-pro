# 🔄 Keep Server Awake - FREE Solutions

## Problem
Render FREE tier sleeps after 15 minutes of inactivity.
First request after sleep takes 30-50 seconds (bad UX).

## Solution 1: UptimeRobot (Recommended - 100% FREE)

### Setup Steps:
1. Go to https://uptimerobot.com
2. Sign up (FREE account)
3. Click "Add New Monitor"
4. Configure:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: ShopSmart API
   URL: https://your-api.onrender.com/api/health
   Monitoring Interval: 5 minutes
   ```
5. Save!

### Result:
- Pings your server every 5 minutes
- Server NEVER sleeps
- FREE forever
- Also alerts you if server goes down

---

## Solution 2: Cron-Job.org (Alternative FREE)

1. Go to https://cron-job.org
2. Sign up FREE
3. Create job:
   ```
   URL: https://your-api.onrender.com/api/health
   Schedule: Every 5 minutes (*/5 * * * *)
   ```

---

## Solution 3: Self-Ping from Server (Built-in)

Add this to your server code - it pings itself!

```javascript
// Add to server.js
const https = require('https');

// Self-ping every 14 minutes to prevent sleep
const SELF_PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

function keepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.API_URL;
  
  if (url && process.env.NODE_ENV === 'production') {
    setInterval(() => {
      https.get(`${url}/api/health`, (res) => {
        console.log(`[Keep-Alive] Ping status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('[Keep-Alive] Ping failed:', err.message);
      });
    }, SELF_PING_INTERVAL);
    
    console.log('✅ Keep-alive enabled (pings every 14 min)');
  }
}

// Call after server starts
keepAlive();
```

---

## Solution 4: Use Railway Instead ($5 FREE credit/month)

Railway gives $5 FREE credit monthly = ~500 hours = NO SLEEP

1. Go to https://railway.app
2. Sign up with GitHub
3. Deploy same way as Render
4. Server runs 24/7 with no sleep!

---

## Comparison

| Solution | Cost | Setup Time | Reliability |
|----------|------|------------|-------------|
| UptimeRobot | FREE | 2 min | ⭐⭐⭐⭐⭐ |
| Cron-job.org | FREE | 2 min | ⭐⭐⭐⭐ |
| Self-ping | FREE | 5 min | ⭐⭐⭐ |
| Railway | FREE $5 | 10 min | ⭐⭐⭐⭐⭐ |

---

## Recommended Setup

Use BOTH for maximum reliability:
1. ✅ UptimeRobot (external ping)
2. ✅ Self-ping code (backup)

This ensures your server NEVER sleeps!
