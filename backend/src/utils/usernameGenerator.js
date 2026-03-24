/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Generates unique usernames from user email or name, ensuring uniqueness via database checks.
*/

const UserModel = require('../models/userModel');

/**
 * Generate a base username from email or name
 * @param {string} email - User email address
 * @param {string} name - User full name (optional fallback)
 * @returns {string} Sanitized base username
 */
function generateBaseUsername(email, name) {
  let base = '';
  if (email) {
    // Extract part before @
    base = email.split('@')[0];
  } else if (name) {
    // Convert name to lowercase, remove spaces and special characters
    base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  // Remove any remaining special characters and limit length to 40
  base = base.replace(/[^a-z0-9]/g, '').substring(0, 40);
  if (!base) {
    // Fallback to 'user' if no valid characters
    base = 'user';
  }
  return base;
}

/**
 * Generate a unique username by checking database and appending numbers if needed
 * @param {string} baseUsername - Initial username candidate
 * @returns {Promise<string>} Unique username
 */
async function ensureUniqueUsername(baseUsername) {
  let username = baseUsername;
  let suffix = 1;
  let exists = await UserModel.usernameExists(username);
  while (exists) {
    username = `${baseUsername}${suffix}`;
    // Prevent overly long usernames (max 50 characters)
    if (username.length > 50) {
      username = username.substring(0, 47) + suffix;
    }
    exists = await UserModel.usernameExists(username);
    suffix++;
    // Safety limit to avoid infinite loop
    if (suffix > 1000) {
      username = `${baseUsername}${Date.now()}`.substring(0, 50);
      break;
    }
  }
  return username;
}

/**
 * Generate a unique username from email and name
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {Promise<string>} Unique username
 */
async function generateUniqueUsername(email, name) {
  const base = generateBaseUsername(email, name);
  return ensureUniqueUsername(base);
}

module.exports = {
  generateBaseUsername,
  ensureUniqueUsername,
  generateUniqueUsername
};