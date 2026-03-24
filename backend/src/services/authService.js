/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Authentication business logic - registration, login, OTP handling, session management.
*/

const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');
const SessionModel = require('../models/sessionModel');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');
const { generateUniqueUsername } = require('../utils/usernameGenerator');
const otpService = require('./otpService');
const emailService = require('./emailService');
const config = require('../config/env');

/**
 * Register a new user (pending verification)
 * @param {Object} userData - User registration data
 * @param {string} userData.name - Full name
 * @param {string} userData.email - Email address
 * @param {string} userData.mobile - Mobile number
 * @param {number} userData.age - Age
 * @param {string} userData.gender - Gender
 * @param {string} userData.password - Plain text password
 * @returns {Promise<Object>} Created user object and OTP code
 */
async function registerUser(userData) {
  // Check uniqueness
  const emailExists = await UserModel.emailExists(userData.email);
  if (emailExists) {
    throw new Error('Email already registered');
  }

  const mobileExists = await UserModel.mobileExists(userData.mobile);
  if (mobileExists) {
    throw new Error('Mobile number already registered');
  }

  // Generate username
  const username = await generateUniqueUsername(userData.email, userData.name);

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user
  const user = await UserModel.create({
    name: userData.name,
    email: userData.email,
    mobileNumber: userData.mobile,
    age: userData.age,
    gender: userData.gender,
    username,
    passwordHash
  });

  // Generate OTP
  const otpCode = await otpService.createOtp(userData.email, 'registration');

  return { user, otpCode };
}

/**
 * Verify user account with OTP
 * @param {string} email - User email
 * @param {string} otpCode - OTP code
 * @returns {Promise<Object>} Verified user
 */
async function verifyUserAccount(email, otpCode) {
  const isValid = await otpService.validateOtp(email, otpCode, 'registration');
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  const user = await UserModel.verifyUser(email);
  if (!user) {
    throw new Error('User not found');
  }

  // Send welcome email (fire and forget)
  emailService.sendWelcomeEmail(email, user.name).catch(err => {
    console.error('Failed to send welcome email:', err.message);
  });

  return user;
}

/**
 * Authenticate user and create session
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @param {Object} req - Express request object (for device info and IP)
 * @returns {Promise<Object>} { token, user, session }
 */
async function loginUser(email, password, req) {
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.is_verified) {
    throw new Error('Account not verified');
  }

  if (!user.is_active) {
    throw new Error('Account deactivated');
  }

  const passwordMatch = await comparePassword(password, user.password_hash);
  if (!passwordMatch) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT
  const payload = {
    userId: user.id,
    email: user.email,
    username: user.username
  };
  const token = generateToken(payload);

  // Calculate expiration
  const expiresInSeconds = parseInt(config.jwt.expiresIn, 10);
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

  // Create session
  const session = await SessionModel.create({
    userId: user.id,
    token,
    deviceInfo: extractDeviceInfo(req),
    ipAddress: extractIpAddress(req),
    expiresAt
  });

  // Update last login
  await UserModel.updateLastLogin(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username
    },
    session: {
      id: session.id,
      expires_at: session.expires_at
    }
  };
}

/**
 * Logout user by revoking session
 * @param {string} token - JWT token
 * @returns {Promise<boolean>}
 */
async function logoutUser(token) {
  const session = await SessionModel.findActiveByToken(token);
  if (session) {
    await SessionModel.revoke(session.id);
    return true;
  }
  return false;
}

/**
 * Refresh JWT token
 * @param {string} oldToken - Existing JWT token
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} New token and session
 */
async function refreshUserToken(oldToken, req) {
  const session = await SessionModel.findActiveByToken(oldToken);
  if (!session) {
    throw new Error('Session not found or expired');
  }

  // Get user
  const user = await UserModel.findById(session.user_id);
  if (!user || !user.is_active) {
    throw new Error('User inactive');
  }

  // Generate new token
  const payload = {
    userId: user.id,
    email: user.email,
    username: user.username
  };
  const newToken = generateToken(payload);

  // Calculate new expiration
  const expiresInSeconds = parseInt(config.jwt.expiresIn, 10);
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

  // Revoke old session and create new one
  await SessionModel.revoke(session.id);
  const newSession = await SessionModel.create({
    userId: user.id,
    token: newToken,
    deviceInfo: extractDeviceInfo(req),
    ipAddress: extractIpAddress(req),
    expiresAt
  });

  return {
    token: newToken,
    session: {
      id: newSession.id,
      expires_at: newSession.expires_at
    }
  };
}

/**
 * Extract IP address from request
 * @param {Object} req - Express request
 * @returns {string|null}
 */
function extractIpAddress(req) {
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
}

/**
 * Extract device information from request
 * @param {Object} req - Express request
 * @returns {Object}
 */
function extractDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  // Simple parsing; can be extended with ua-parser-js
  return {
    userAgent,
    browser: 'unknown',
    os: 'unknown',
    device: 'unknown'
  };
}

module.exports = {
  registerUser,
  verifyUserAccount,
  loginUser,
  logoutUser,
  refreshUserToken
};