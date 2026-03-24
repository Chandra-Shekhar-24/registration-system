/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: JWT token generation and verification utilities with secure defaults.
*/

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a JWT token for a user
 * @param {Object} payload - Data to encode in token (typically { userId, email, ... })
 * @param {string} [expiresIn] - Optional expiration override; defaults to config value
 * @returns {string} Signed JWT token
 */
function generateToken(payload, expiresIn = null) {
  const options = {
    expiresIn: expiresIn || config.jwt.expiresIn,
    issuer: 'registration-system',
    audience: 'registration-system-client'
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload if valid, null if invalid
 * @throws {Error} If token is malformed or expired (caller should handle)
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'registration-system',
      audience: 'registration-system-client'
    });
    return decoded;
  } catch (error) {
    // Re-throw with a consistent error message for the middleware
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verification (use only for extracting non-sensitive data)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};