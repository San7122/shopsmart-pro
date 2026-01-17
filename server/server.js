/**
 * ShopSmart Pro - Production Server
 * Fully configured with security, caching, monitoring
 */

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Security & Performance Middleware
let securityMiddleware = null;
let cacheMiddleware = null;

try {
  securityMiddleware = require('./middleware/security');
  cacheMiddleware = require('./middleware/cache');
} catch (err) {
  console.warn('⚠️ Advanced middleware not available, using basic config');
}

const app = express();

// ============================================================
// TRUST PROXY (for rate limiting behind reverse proxy)
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
if (securityMiddleware) {
  app.use(securityMiddleware.helmetConfig);
  app.use(securityMiddleware.corsMiddleware);
  app.use(securityMiddleware.mongoSanitize);
  app.use(securityMiddleware.xssClean);
  app.use(securityMiddleware.hppProtect);
} else {
  // Fallback CORS
  const cors = require('cors');
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://shopsmart.pro', 'https://www.shopsmart.pro']
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }));
}

// ============================================================
// PERFORMANCE MIDDLEWARE
// ============================================================
app.use(compression({ level: 6 }));

// ============================================================
// BODY PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (securityMiddleware) {
  app.use(securityMiddleware.requestSizeLimiter);
  app.use(securityMiddleware.sanitizeRequest);
}

// ============================================================
// LOGGING
// ============================================================
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

if (securityMiddleware) {
  app.use(securityMiddleware.requestLogger);
  app.use(securityMiddleware.securityLoggingMiddleware);
}

// ============================================================
// STATIC FILES
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// HEALTH CHECK (No rate limiting)
// ============================================================
app.get('/api/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let cacheStats = { connected: false };
  
  if (cacheMiddleware) {
    cacheStats = await cacheMiddleware.getCacheStats();
  }
  
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'ShopSmart Pro API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      mongodb: mongoStatus,
      redis: cacheStats.connected ? 'connected' : 'disconnected'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

// ============================================================
// API ROUTES WITH RATE LIMITING
// ============================================================

// Apply rate limiters if available
const apiLimiter = securityMiddleware?.apiLimiter || ((req, res, next) => next());
const authLimiter = securityMiddleware?.authLimiter || ((req, res, next) => next());
const webhookLimiter = securityMiddleware?.webhookLimiter || ((req, res, next) => next());

// Auth routes - strict rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));

// n8n webhook routes - high rate limit (if exists)
try {
  app.use('/api/n8n', webhookLimiter, require('./routes/n8nRoutes'));
} catch (err) {
  console.warn('⚠️ n8n routes not configured');
}

// All other API routes - standard rate limit
app.use('/api/customers', apiLimiter, require('./routes/customers'));
app.use('/api/transactions', apiLimiter, require('./routes/transactions'));
app.use('/api/categories', apiLimiter, require('./routes/categories'));
app.use('/api/products', apiLimiter, require('./routes/products'));
app.use('/api/analytics', apiLimiter, require('./routes/analytics'));
app.use('/api/storefront', require('./routes/storefront'));
app.use('/api/invoices', apiLimiter, require('./routes/invoices'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/payments', apiLimiter, require('./routes/altPayments'));

// Public store route (alias)
app.use('/api/store', require('./routes/storefront'));

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({
      success: false,
      error: `${field || 'Field'} already exists`
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  // Connect to database
  await connectDB();
  
  server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 ShopSmart Pro Server - PRODUCTION READY              ║
║                                                           ║
║   📍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(12)}                    ║
║   🌐 Port: ${String(PORT).padEnd(8)}                                   ║
║   📅 Started: ${new Date().toLocaleTimeString().padEnd(12)}                         ║
║                                                           ║
║   ✅ Security: ${securityMiddleware ? 'Enabled ' : 'Basic  '}                             ║
║   ✅ Caching:  ${cacheMiddleware ? 'Enabled ' : 'Disabled'}                             ║
║   ✅ Compression: Enabled                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Close Redis connection if available
    if (securityMiddleware?.redisClient) {
      await securityMiddleware.redisClient.quit();
      console.log('✅ Redis connection closed');
    }
    
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  }
});

// Start the server
startServer();

// ============================================================
// KEEP-ALIVE: Prevent Render/Railway free tier from sleeping
// ============================================================
const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.API_URL || process.env.BACKEND_URL;
  
  if (url && process.env.NODE_ENV === 'production') {
    const https = require('https');
    const http = require('http');
    const pingUrl = url.startsWith('https') ? https : http;
    
    // Ping every 14 minutes (Render sleeps at 15)
    const PING_INTERVAL = 14 * 60 * 1000;
    
    setInterval(() => {
      const healthUrl = `${url}/api/health`;
      pingUrl.get(healthUrl, (res) => {
        console.log(`[Keep-Alive] ✓ Ping OK - Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error(`[Keep-Alive] ✗ Ping failed: ${err.message}`);
      });
    }, PING_INTERVAL);
    
    console.log(`✅ Keep-Alive enabled - Pinging ${url} every 14 minutes`);
  }
};

// Start keep-alive after server is running
setTimeout(keepAlive, 5000);

module.exports = app;
