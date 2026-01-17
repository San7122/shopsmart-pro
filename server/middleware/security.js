/**
 * Security & Rate Limiting Middleware
 * Production-grade security for ShopSmart Pro
 * Supports both Redis and memory store for FREE tier
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { securityLoggers, securityLoggingMiddleware } = require('../utils/securityLogger');

// Check if Redis rate limiting is enabled
const REDIS_RATE_LIMIT = process.env.ENABLE_RATE_LIMIT_REDIS === 'true';

let RedisStore = null;
let redisClient = null;

// Initialize Redis only if enabled
if (REDIS_RATE_LIMIT && process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    RedisStore = require('rate-limit-redis');
    
    redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1
    });
    
    redisClient.on('error', (err) => {
      console.warn('Redis rate-limit error, using memory store:', err.message);
      redisClient = null;
    });
  } catch (err) {
    console.warn('Redis not available for rate limiting, using memory store');
  }
} else {
  console.log('ℹ️ Using memory store for rate limiting (FREE tier)');
}

// Helper to create store config
const getStoreConfig = (prefix) => {
  if (redisClient && RedisStore) {
    return {
      store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: prefix
      })
    };
  }
  return {}; // Use default memory store
};

// ============================================================
// RATE LIMITERS
// ============================================================

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again after 15 minutes',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getStoreConfig('rl:api:'),
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    // Log rate limit exceeded event
    securityLoggers.logRateLimitExceeded(
      req.ip,
      req.originalUrl,
      100,
      '15 minutes'
    );
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again after 15 minutes',
      retryAfter: 900
    });
  }
});

/**
 * Authentication Rate Limiter
 * 5 attempts per 15 minutes per IP (stricter for login/register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getStoreConfig('rl:auth:'),
  handler: (req, res) => {
    // Log authentication rate limit exceeded
    securityLoggers.logRateLimitExceeded(
      req.ip,
      req.originalUrl,
      5,
      '15 minutes'
    );
    securityLoggers.logAuthLockout(
      req.ip,
      5
    );
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again after 15 minutes',
      retryAfter: 900
    });
  }
});

/**
 * OTP Rate Limiter
 * 3 OTP requests per 10 minutes per phone number
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many OTP requests, please try again after 10 minutes',
    retryAfter: 600
  },
  keyGenerator: (req) => {
    return req.body.phone || req.ip;
  },
  ...getStoreConfig('rl:otp:')
});

/**
 * File Upload Rate Limiter
 * 20 uploads per hour per user
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Upload limit reached, please try again after 1 hour',
    retryAfter: 3600
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  ...getStoreConfig('rl:upload:')
});

/**
 * Webhook Rate Limiter for n8n
 * 1000 requests per minute (high limit for automation)
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: 'Webhook rate limit exceeded'
  },
  ...getStoreConfig('rl:webhook:')
});

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

/**
 * Helmet Security Headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.API_URL || "http://localhost:5000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL,
      process.env.MOBILE_APP_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400 // 24 hours
};

/**
 * Request Sanitization Middleware
 */
const sanitizeRequest = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    sanitizeObject(req.body);
  }
  // Sanitize query params
  if (req.query) {
    sanitizeObject(req.query);
  }
  // Sanitize params
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
};

function sanitizeObject(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potential script tags
      obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      // Remove potential SQL injection patterns
      obj[key] = obj[key].replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large. Maximum size is 10MB.'
    });
  }
  next();
};

/**
 * API Key Validation for Internal Services
 */
const validateInternalApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const validKey = process.env.SHOPSMART_INTERNAL_API_KEY;

  if (!validKey || apiKey !== validKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }
  next();
};

/**
 * Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      console.error('[API Error]', JSON.stringify(log));
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('[API]', JSON.stringify(log));
    }
  });

  next();
};

/**
 * IP Whitelist for Admin Routes
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    }
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Rate Limiters
  apiLimiter,
  authLimiter,
  otpLimiter,
  uploadLimiter,
  webhookLimiter,
  
  // Security Middleware
  helmetConfig,
  corsMiddleware: cors(corsOptions),
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
  hppProtect: hpp(),
  sanitizeRequest,
  requestSizeLimiter,
  validateInternalApiKey,
  requestLogger,
  ipWhitelist,
  securityLoggingMiddleware,
  
  // Redis client for other uses
  redisClient
};
