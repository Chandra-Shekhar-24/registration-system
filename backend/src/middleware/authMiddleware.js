/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Authentication middleware to verify JWT and attach user to request.
*/

const { verifyToken } = require('../utils/jwt');
const SessionModel = require('../models/sessionModel');
const UserModel = require('../models/userModel');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header, validates session, and attaches user to req.user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided or invalid format'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token missing'
        }
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.message === 'Token expired') {
        return res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired'
          }
        });
      }
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }

    // Validate session exists and is active
    const session = await SessionModel.findActiveByToken(token);
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'SESSION_INVALID',
          message: 'Session not found or expired'
        }
      });
    }

    // Get user from database
    const user = await UserModel.findById(session.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive or not found'
        }
      });
    }

    // Update session last activity asynchronously (don't block)
    SessionModel.updateLastActivity(session.id).catch(err => {
      console.error('Failed to update session last activity:', err.message);
    });

    // Attach user and session to request
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Authentication failed due to server error'
      }
    });
  }
}

module.exports = authMiddleware;