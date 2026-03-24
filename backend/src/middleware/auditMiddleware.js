/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Middleware to automatically log API requests to audit_logs for monitoring and security.
*/

const auditService = require('../services/auditService');

/**
 * Audit middleware factory
 * @param {Object} options - Configuration options
 * @param {boolean} options.logAll - If true, logs all requests; otherwise only authenticated
 * @param {string[]} options.excludePaths - Array of path patterns to exclude from logging
 * @returns {Function} Express middleware
 */
function auditMiddleware(options = {}) {
  const { logAll = false, excludePaths = ['/health', '/metrics'] } = options;

  return (req, res, next) => {
    // Skip logging for excluded paths
    const shouldSkip = excludePaths.some(path => req.path.startsWith(path));
    if (shouldSkip) {
      return next();
    }

    // Determine if we should log this request
    const shouldLog = logAll || req.user;
    if (!shouldLog) {
      return next();
    }

    // Capture start time for response duration
    const startTime = Date.now();

    // Store request details
    const requestInfo = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method === 'POST' || req.method === 'PUT' ? sanitizeBody(req.body) : undefined,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Override end method to log after response
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      const logData = {
        userId: req.user?.id || null,
        action: `${req.method} ${req.path}`,
        entityType: 'request',
        entityId: null,
        oldData: null,
        newData: {
          request: requestInfo,
          response: {
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`
          }
        },
        req
      };

      // Log asynchronously without blocking
      auditService.logAction(logData).catch(err => {
        console.error('Audit middleware logging failed:', err.message);
      });

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Sanitize request body to remove sensitive fields before logging
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'current_password', 'new_password', 'otp_code'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = auditMiddleware;