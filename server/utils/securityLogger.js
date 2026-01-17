/**
 * Security Event Logger Utility
 * Comprehensive logging for security-related events and incidents
 */

const winston = require('winston');
const path = require('path');

// Create security logger with Winston
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shopsmart-security' },
  transports: [
    // Security events file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-events.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Security errors file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    
    // Console output for development
    ...(process.env.NODE_ENV !== 'production' 
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })]
      : [])
  ]
});

// Security event types
const SECURITY_EVENTS = {
  AUTH_ATTEMPT: 'AUTH_ATTEMPT',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  AUTH_LOCKOUT: 'AUTH_LOCKOUT',
  TOKEN_ISSUED: 'TOKEN_ISSUED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  API_KEY_ACCESS: 'API_KEY_ACCESS',
  API_KEY_DENIED: 'API_KEY_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  NO_SQL_INJECTION_ATTEMPT: 'NO_SQL_INJECTION_ATTEMPT',
  CSRF_ATTEMPT: 'CSRF_ATTEMPT',
  IP_BLOCKED: 'IP_BLOCKED',
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
};

// Log security events
const logSecurityEvent = (eventType, details = {}) => {
  const logEntry = {
    eventType,
    timestamp: new Date().toISOString(),
    ...details
  };

  switch (eventType) {
    case SECURITY_EVENTS.AUTH_FAILURE:
    case SECURITY_EVENTS.TOKEN_INVALID:
    case SECURITY_EVENTS.RATE_LIMIT_EXCEEDED:
    case SECURITY_EVENTS.XSS_ATTEMPT:
    case SECURITY_EVENTS.SQL_INJECTION_ATTEMPT:
    case SECURITY_EVENTS.NO_SQL_INJECTION_ATTEMPT:
    case SECURITY_EVENTS.IP_BLOCKED:
    case SECURITY_EVENTS.PRIVILEGE_ESCALATION:
      securityLogger.warn('SECURITY ALERT', logEntry);
      break;
    
    case SECURITY_EVENTS.AUTH_LOCKOUT:
    case SECURITY_EVENTS.CSRF_ATTEMPT:
      securityLogger.error('SECURITY INCIDENT', logEntry);
      break;
    
    default:
      securityLogger.info('SECURITY EVENT', logEntry);
  }
};

// Specific logging functions for common security events
const securityLoggers = {
  // Authentication events
  logAuthAttempt: (ip, userAgent, userId = null) => {
    logSecurityEvent(SECURITY_EVENTS.AUTH_ATTEMPT, {
      ip,
      userAgent,
      userId
    });
  },

  logAuthSuccess: (userId, ip, userAgent) => {
    logSecurityEvent(SECURITY_EVENTS.AUTH_SUCCESS, {
      userId,
      ip,
      userAgent
    });
  },

  logAuthFailure: (ip, userAgent, reason, userId = null) => {
    logSecurityEvent(SECURITY_EVENTS.AUTH_FAILURE, {
      ip,
      userAgent,
      reason,
      userId
    });
  },

  logAuthLockout: (ip, attempts, userId = null) => {
    logSecurityEvent(SECURITY_EVENTS.AUTH_LOCKOUT, {
      ip,
      attempts,
      userId
    });
  },

  // Token events
  logTokenIssued: (userId, tokenId, expiresAt) => {
    logSecurityEvent(SECURITY_EVENTS.TOKEN_ISSUED, {
      userId,
      tokenId,
      expiresAt
    });
  },

  logTokenInvalid: (tokenId, reason, ip = null) => {
    logSecurityEvent(SECURITY_EVENTS.TOKEN_INVALID, {
      tokenId,
      reason,
      ip
    });
  },

  // API key events
  logApiKeyAccess: (apiKeyId, endpoint, ip, userAgent) => {
    logSecurityEvent(SECURITY_EVENTS.API_KEY_ACCESS, {
      apiKeyId,
      endpoint,
      ip,
      userAgent
    });
  },

  logApiKeyDenied: (apiKeyId, reason, ip, userAgent) => {
    logSecurityEvent(SECURITY_EVENTS.API_KEY_DENIED, {
      apiKeyId,
      reason,
      ip,
      userAgent
    });
  },

  // Rate limiting events
  logRateLimitExceeded: (ip, endpoint, limit, window) => {
    logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
      ip,
      endpoint,
      limit,
      window
    });
  },

  // Injection attempt events
  logXSSAttempt: (ip, payload, endpoint) => {
    logSecurityEvent(SECURITY_EVENTS.XSS_ATTEMPT, {
      ip,
      payload: payload.substring(0, 200), // Truncate to prevent log flooding
      endpoint,
      threatLevel: 'HIGH'
    });
  },

  logSQLInjectionAttempt: (ip, payload, endpoint) => {
    logSecurityEvent(SECURITY_EVENTS.SQL_INJECTION_ATTEMPT, {
      ip,
      payload: payload.substring(0, 200),
      endpoint,
      threatLevel: 'CRITICAL'
    });
  },

  logNoSQLInjectionAttempt: (ip, payload, endpoint) => {
    logSecurityEvent(SECURITY_EVENTS.NO_SQL_INJECTION_ATTEMPT, {
      ip,
      payload: payload.substring(0, 200),
      endpoint,
      threatLevel: 'HIGH'
    });
  },

  // Suspicious activity
  logSuspiciousActivity: (activityType, details, ip, userId = null) => {
    logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
      activityType,
      details,
      ip,
      userId,
      threatLevel: 'MEDIUM'
    });
  },

  // Admin access
  logAdminAccess: (userId, action, resourceId = null) => {
    logSecurityEvent(SECURITY_EVENTS.ADMIN_ACCESS, {
      userId,
      action,
      resourceId
    });
  }
};

// Middleware for automatic security logging
const securityLoggingMiddleware = (req, res, next) => {
  // Log suspicious request patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi,
    /\$where|\$ne|\$gt/gi
  ];

  const requestBody = JSON.stringify(req.body);
  const requestQuery = JSON.stringify(req.query);
  const requestParams = JSON.stringify(req.params);

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestBody) || pattern.test(requestQuery) || pattern.test(requestParams)) {
      const patternType = pattern.source.includes('script') ? 'XSS' : 
                         pattern.source.includes('SELECT') ? 'SQL_INJECTION' : 'NO_SQL_INJECTION';
      
      securityLoggers[`log${patternType}Attempt`](
        req.ip,
        requestBody.substring(0, 100),
        req.originalUrl
      );
    }
  }

  // Log admin access attempts
  if (req.originalUrl.includes('/admin/') || req.originalUrl.includes('/api/admin/')) {
    securityLoggers.logSuspiciousActivity(
      'ADMIN_ENDPOINT_ACCESS',
      `Attempted access to admin endpoint: ${req.originalUrl}`,
      req.ip,
      req.user?.id
    );
  }

  next();
};

// Export everything
module.exports = {
  securityLogger,
  SECURITY_EVENTS,
  logSecurityEvent,
  securityLoggers,
  securityLoggingMiddleware
};