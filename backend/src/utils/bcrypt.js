/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Password hashing and comparison utilities using bcrypt.
*/

const bcrypt = require('bcrypt');

// Number of salt rounds for bcrypt hashing (10-12 recommended for performance/security balance)
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if password matches hash
 */
async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword
};