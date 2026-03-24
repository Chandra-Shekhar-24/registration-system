/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Authentication controller handling registration, OTP verification, login, logout, session management.
*/

const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');
const SessionModel = require('../models/sessionModel');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken, verifyToken } = require('../utils/jwt');
const { generateUniqueUsername } = require('../utils/usernameGenerator');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');
const config = require('../config/env');

/**
 * Helper: Extract client IP from request
 * @param {Object} req - Express request
 * @returns {string} IP address
 */
function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || null;
}

/**
 * Helper: Extract device info from user-agent
 * @param {Object} req - Express request
 * @returns {Object} Device information
 */
function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  // Simple device detection; can be extended with libraries like ua-parser-js
  return {
    userAgent,
    browser: 'unknown',
    os: 'unknown',
    device: 'unknown'
  };
}

/**
 * POST /auth/register/request-otp
 * Request OTP for registration
 */
async function requestRegistrationOtp(req, res, next) {
  try {
    const { name, email, mobile, age, gender, password } = req.body;

    // Check if email already exists
    const emailExists = await UserModel.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        }
      });
    }

    // Check if mobile already exists
    const mobileExists = await UserModel.mobileExists(mobile);
    if (mobileExists) {
      return res.status(409).json({
        error: {
          code: 'MOBILE_EXISTS',
          message: 'Mobile number already registered'
        }
      });
    }

    // Generate username
    const username = await generateUniqueUsername(email, name);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (pending verification)
    const user = await UserModel.create({
      name,
      email,
      mobileNumber: mobile,
      age,
      gender,
      username,
      passwordHash
    });

    // Generate and store OTP
    const otpCode = await otpService.createOtp(email, 'registration');

    // Send OTP email
    await emailService.sendOtpEmail(email, otpCode);

    // Log registration action (anonymous, no user id yet)
    await auditService.logAction({
      userId: null,
      action: 'REGISTRATION_REQUEST',
      entityType: 'user',
      entityId: user.id,
      req
    });

    return res.status(200).json({
      message: 'OTP sent to email',
      email: email
    });
  } catch (error) {
    console.error('Registration OTP request error:', error);
    next(error);
  }
}

/**
 * POST /auth/register/verify-otp
 * Verify OTP and activate account
 */
async function verifyRegistrationOtp(req, res, next) {
  try {
    const { email, otp_code } = req.body;

    // Validate OTP
    const isValid = await otpService.validateOtp(email, otp_code, 'registration');
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        }
      });
    }

    // Verify user account
    const user = await UserModel.verifyUser(email);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(email, user.name);

    // Log OTP verification
    await auditService.logOtpVerification(user, req);

    return res.status(200).json({
      message: 'Account verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        is_verified: true
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    next(error);
  }
}

/**
 * POST /auth/login
 * Authenticate user and create session
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check if account is verified
    if (!user.is_verified) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_NOT_VERIFIED',
          message: 'Please verify your email before logging in'
        }
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account has been deactivated'
        }
      });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate JWT token
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

    // Create session record
    const session = await SessionModel.create({
      userId: user.id,
      token,
      deviceInfo: getDeviceInfo(req),
      ipAddress: getClientIp(req),
      expiresAt
    });

    // Update last login timestamp
    await UserModel.updateLastLogin(user.id);

    // Log login
    await auditService.logLogin(user, req);

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
}

/**
 * POST /auth/logout
 * Invalidate current session
 */
async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const session = await SessionModel.findActiveByToken(token);
      if (session) {
        await SessionModel.revoke(session.id);
        await auditService.logLogout({ id: session.user_id }, req);
      }
    }

    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
}

/**
 * POST /auth/refresh
 * Refresh JWT token (optional)
 */
async function refreshToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'NO_TOKEN',
          message: 'No token provided'
        }
      });
    }

    const decoded = verifyToken(token);
    const session = await SessionModel.findActiveByToken(token);
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'INVALID_SESSION',
          message: 'Session expired or invalid'
        }
      });
    }

    // Generate new token
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    const newToken = generateToken(payload);

    // Calculate new expiration
    const expiresInSeconds = parseInt(config.jwt.expiresIn, 10);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    // Update session with new token and expiration
    await SessionModel.revoke(session.id);
    const newSession = await SessionModel.create({
      userId: session.user_id,
      token: newToken,
      deviceInfo: getDeviceInfo(req),
      ipAddress: getClientIp(req),
      expiresAt
    });

    return res.status(200).json({
      token: newToken,
      session: {
        id: newSession.id,
        expires_at: newSession.expires_at
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
}

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
async function getActiveSessions(req, res, next) {
  try {
    const userId = req.user.id; // Set by auth middleware
    const sessions = await SessionModel.findActiveByUser(userId);

    return res.status(200).json({
      sessions: sessions.map(s => ({
        id: s.id,
        device_info: s.device_info,
        ip_address: s.ip_address,
        created_at: s.created_at,
        last_activity: s.last_activity,
        expires_at: s.expires_at
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    next(error);
  }
}

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
async function revokeSession(req, res, next) {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user.id;

    const sessions = await SessionModel.findActiveByUser(userId);
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) {
      return res.status(404).json({
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or already revoked'
        }
      });
    }

    await SessionModel.revoke(sessionId);
    await auditService.logAction({
      userId,
      action: 'REVOKE_SESSION',
      entityType: 'session',
      entityId: sessionId,
      req
    });

    return res.status(200).json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    next(error);
  }
}

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  logout,
  refreshToken,
  getActiveSessions,
  revokeSession
};