/**
 * Advanced Caching Middleware with Redis
 * Production-grade caching for ShopSmart Pro
 * Supports both Redis and in-memory fallback for FREE tier
 */

// Check if Redis is enabled
const REDIS_ENABLED = process.env.ENABLE_REDIS_CACHE === 'true';

let redis = null;

// Initialize Redis only if enabled
if (REDIS_ENABLED && process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: true
    });
    
    redis.on('connect', () => console.log('✅ Redis Cache connected'));
    redis.on('error', (err) => {
      console.warn('⚠️ Redis error, using memory cache:', err.message);
      redis = null;
    });
  } catch (err) {
    console.warn('⚠️ Redis not available, using memory cache');
  }
} else {
  console.log('ℹ️ Redis disabled, using in-memory cache');
}

// ============================================================
// IN-MEMORY CACHE FALLBACK
// ============================================================
const memoryCache = new Map();
const memoryCacheTTL = new Map();

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheTTL.entries()) {
    if (now > expiry) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
}

// Cleanup every 60 seconds
setInterval(cleanupMemoryCache, 60000);

// ============================================================
// CACHE CONFIGURATION
// ============================================================

const CACHE_CONFIG = {
  // User data - short TTL as it changes frequently
  user: { ttl: 300, prefix: 'user:' }, // 5 minutes
  
  // Customer list - medium TTL
  customers: { ttl: 600, prefix: 'customers:' }, // 10 minutes
  
  // Products - medium TTL
  products: { ttl: 600, prefix: 'products:' }, // 10 minutes
  
  // Categories - long TTL as they rarely change
  categories: { ttl: 3600, prefix: 'categories:' }, // 1 hour
  
  // Dashboard stats - short TTL
  dashboard: { ttl: 120, prefix: 'dashboard:' }, // 2 minutes
  
  // Reports - medium TTL
  reports: { ttl: 900, prefix: 'reports:' }, // 15 minutes
  
  // Storefront - public, longer TTL
  storefront: { ttl: 1800, prefix: 'store:' }, // 30 minutes
  
  // Session data
  session: { ttl: 86400, prefix: 'session:' } // 24 hours
};

// ============================================================
// CORE CACHE FUNCTIONS
// ============================================================

/**
 * Get data from cache (Redis or Memory)
 */
async function getCache(key) {
  try {
    if (redis) {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      // Memory cache fallback
      const expiry = memoryCacheTTL.get(key);
      if (expiry && Date.now() > expiry) {
        memoryCache.delete(key);
        memoryCacheTTL.delete(key);
        return null;
      }
      return memoryCache.get(key) || null;
    }
  } catch (error) {
    console.error('Cache GET error:', error.message);
    return null;
  }
}

/**
 * Set data in cache (Redis or Memory)
 */
async function setCache(key, data, ttlSeconds = 300) {
  try {
    if (redis) {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } else {
      // Memory cache fallback
      memoryCache.set(key, data);
      memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
    }
    return true;
  } catch (error) {
    console.error('Cache SET error:', error.message);
    return false;
  }
}

/**
 * Delete from cache (Redis or Memory)
 */
async function deleteCache(key) {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
    return true;
  } catch (error) {
    console.error('Cache DEL error:', error.message);
    return false;
  }
}

/**
 * Delete multiple keys by pattern (Redis only, memory skips)
 */
async function deleteCachePattern(pattern) {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } else {
      // For memory cache, delete matching keys
      let count = 0;
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          memoryCacheTTL.delete(key);
          count++;
        }
      }
      return count;
    }
  } catch (error) {
    console.error('Cache pattern DEL error:', error.message);
    return 0;
  }
}

/**
 * Clear all cache for a user
 */
async function clearUserCache(userId) {
  const patterns = [
    `user:${userId}*`,
    `customers:${userId}*`,
    `products:${userId}*`,
    `dashboard:${userId}*`,
    `reports:${userId}*`
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await deleteCachePattern(pattern);
  }
  return totalDeleted;
}

// ============================================================
// CACHE MIDDLEWARE
// ============================================================

/**
 * Generic cache middleware factory
 */
function cacheMiddleware(config) {
  const { ttl, prefix, keyGenerator } = config;
  
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `${prefix}${req.user?.id || 'public'}:${req.originalUrl}`;
    
    try {
      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        // Cache hit
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Cache miss - store original json method
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          setCache(cacheKey, data, ttl);
        }
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Clears relevant cache when data is modified
 */
function invalidateCache(patterns) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async (data) => {
      // Clear cache after successful modification
      if (res.statusCode < 400 && data.success !== false) {
        const userId = req.user?.id;
        
        for (const pattern of patterns) {
          const fullPattern = pattern.replace('{userId}', userId || '*');
          await deleteCachePattern(fullPattern);
        }
      }
      return originalJson(data);
    };
    
    next();
  };
}

// ============================================================
// PRE-CONFIGURED CACHE MIDDLEWARE
// ============================================================

// Dashboard cache
const cacheDashboard = cacheMiddleware({
  ttl: CACHE_CONFIG.dashboard.ttl,
  prefix: CACHE_CONFIG.dashboard.prefix,
  keyGenerator: (req) => `dashboard:${req.user.id}`
});

// Customers list cache
const cacheCustomers = cacheMiddleware({
  ttl: CACHE_CONFIG.customers.ttl,
  prefix: CACHE_CONFIG.customers.prefix,
  keyGenerator: (req) => `customers:${req.user.id}:${req.originalUrl}`
});

// Products list cache
const cacheProducts = cacheMiddleware({
  ttl: CACHE_CONFIG.products.ttl,
  prefix: CACHE_CONFIG.products.prefix,
  keyGenerator: (req) => `products:${req.user.id}:${req.originalUrl}`
});

// Categories cache (global)
const cacheCategories = cacheMiddleware({
  ttl: CACHE_CONFIG.categories.ttl,
  prefix: CACHE_CONFIG.categories.prefix,
  keyGenerator: (req) => `categories:all`
});

// Storefront cache (public)
const cacheStorefront = cacheMiddleware({
  ttl: CACHE_CONFIG.storefront.ttl,
  prefix: CACHE_CONFIG.storefront.prefix,
  keyGenerator: (req) => `store:${req.params.slug || req.params.storeId}`
});

// Invalidate customer cache
const invalidateCustomerCache = invalidateCache([
  'customers:{userId}*',
  'dashboard:{userId}*'
]);

// Invalidate product cache
const invalidateProductCache = invalidateCache([
  'products:{userId}*',
  'dashboard:{userId}*',
  'store:*'
]);

// Invalidate transaction cache
const invalidateTransactionCache = invalidateCache([
  'customers:{userId}*',
  'dashboard:{userId}*',
  'reports:{userId}*'
]);

// ============================================================
// CACHE WARMING
// ============================================================

/**
 * Warm up cache for a user
 * Call this after login or periodically
 */
async function warmCache(userId, dataFetchers) {
  console.log(`🔥 Warming cache for user ${userId}`);
  
  const warmingTasks = Object.entries(dataFetchers).map(async ([key, fetcher]) => {
    try {
      const data = await fetcher(userId);
      const cacheKey = `${key}:${userId}`;
      const ttl = CACHE_CONFIG[key]?.ttl || 300;
      await setCache(cacheKey, data, ttl);
      return { key, status: 'success' };
    } catch (error) {
      return { key, status: 'error', error: error.message };
    }
  });
  
  return Promise.all(warmingTasks);
}

// ============================================================
// CACHE STATS
// ============================================================

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    if (redis && redis.status === 'ready') {
      const info = await redis.info('stats');
      const keyspace = await redis.info('keyspace');
      const memory = await redis.info('memory');
      
      return {
        connected: true,
        type: 'redis',
        stats: parseRedisInfo(info),
        keyspace: parseRedisInfo(keyspace),
        memory: parseRedisInfo(memory)
      };
    } else {
      // Memory cache stats
      return {
        connected: true,
        type: 'memory',
        stats: {
          keys: memoryCache.size,
          hits: 'N/A',
          misses: 'N/A'
        },
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        }
      };
    }
  } catch (error) {
    return { connected: false, type: 'none', error: error.message };
  }
}

function parseRedisInfo(info) {
  const result = {};
  info.split('\r\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    }
  });
  return result;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Core functions
  redis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  clearUserCache,
  
  // Middleware
  cacheMiddleware,
  invalidateCache,
  
  // Pre-configured middleware
  cacheDashboard,
  cacheCustomers,
  cacheProducts,
  cacheCategories,
  cacheStorefront,
  invalidateCustomerCache,
  invalidateProductCache,
  invalidateTransactionCache,
  
  // Utilities
  warmCache,
  getCacheStats,
  CACHE_CONFIG
};
