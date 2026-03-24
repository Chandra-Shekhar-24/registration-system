/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Rate limiting middleware using express-rate-limit for different endpoints.
*/

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Rate limiter for OTP requests (3 per hour per email)
 * Email is identified via request body.email or query parameter
 */
const otpLimiter = rateLimit({
  windowMs: config.rateLimits.otpRequest.windowMs,
  max: config.rateLimits.otpRequest.max,
  keyGenerator: (req) => {
    // Use email from body or query as key
    const email = req.body.email || req.query.email;
    return email ? `${req.ip}:${email}` : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please try again later.'
    }
  }
});

/**
 * Rate limiter for login attempts (5 per 15 minutes per IP)
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimits.login.windowMs,
  max: config.rateLimits.login.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins towards limit
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.'
    }
  }
});

/**
 * Rate limiter for password reset requests (2 per hour per email)
 */
const passwordResetLimiter = rateLimit({
  windowMs: config.rateLimits.passwordResetRequest.windowMs,
  max: config.rateLimits.passwordResetRequest.max,
  keyGenerator: (req) => {
    const email = req.body.email || req.query.email;
    return email ? `${req.ip}:${email}` : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.'
    }
  }
});

/**
 * Rate limiter for general authenticated API requests (100 per minute per user)
 * Key is user ID (attached by auth middleware)
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimits.api.windowMs,
  max: config.rateLimits.api.max,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.user, // Only apply to authenticated requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.'
    }
  }
});

module.exports = {
  otpLimiter,
  loginLimiter,
  passwordResetLimiter,
  apiLimiter
};