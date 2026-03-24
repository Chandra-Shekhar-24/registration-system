/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Loads and validates environment variables; provides a central configuration object.
*/

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'FRONTEND_URL'
];

/**
 * Validates that all required environment variables are present.
 * Throws an error if any are missing.
 */
function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

/**
 * Configuration object with typed values and defaults.
 */
const config = {
  // Application
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL,

  // Database
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Additional pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465', // true for port 465, false for other
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM
  },

  // Security & Rate Limiting
  rateLimits: {
    otpRequest: { windowMs: 60 * 60 * 1000, max: 3 },      // 3 per hour
    login: { windowMs: 15 * 60 * 1000, max: 5 },            // 5 per 15 min
    passwordResetRequest: { windowMs: 60 * 60 * 1000, max: 2 }, // 2 per hour
    api: { windowMs: 60 * 1000, max: 100 }                  // 100 per minute
  },

  // OTP settings
  otp: {
    length: 6,
    expiryMinutes: 10
  },

  // Password reset token expiry
  passwordReset: {
    expiryMinutes: 60
  }
};

module.exports = config;