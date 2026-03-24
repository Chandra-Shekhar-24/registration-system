/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Business logic for creating and managing audit logs.
*/

const AuditModel = require('../models/auditModel');

/**
 * Create an audit log entry with common request data
 * @param {Object} params - Audit parameters
 * @param {string|null} params.userId - ID of the user performing action (null for anonymous)
 * @param {string} params.action - Action name (e.g., LOGIN, REGISTER, UPDATE_PROFILE)
 * @param {string|null} params.entityType - Type of entity affected (e.g., 'user', 'session')
 * @param {string|null} params.entityId - Identifier of affected entity
 * @param {Object|null} params.oldData - Previous state (if update)
 * @param {Object|null} params.newData - New state (if update)
 * @param {Object} params.req - Express request object (to extract IP and user-agent)
 * @returns {Promise<void>}
 */
async function logAction(params) {
  try {
    await AuditModel.create({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldData: params.oldData,
      newData: params.newData,
      ipAddress: params.req?.ip || params.req?.connection?.remoteAddress || null,
      userAgent: params.req?.headers?.['user-agent'] || null
    });
  } catch (error) {
    // Never throw from audit logging; log to console but don't break the main flow
    console.error('Audit log creation failed:', error.message);
  }
}

/**
 * Create audit log for user login
 * @param {Object} user - User object (must contain id)
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logLogin(user, req) {
  await logAction({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for user logout
 * @param {Object} user - User object
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logLogout(user, req) {
  await logAction({
    userId: user.id,
    action: 'LOGOUT',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for user registration (before verification)
 * @param {Object} user - User object
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logRegistration(user, req) {
  await logAction({
    userId: user.id,
    action: 'REGISTER',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for OTP verification
 * @param {Object} user - User object
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logOtpVerification(user, req) {
  await logAction({
    userId: user.id,
    action: 'VERIFY_OTP',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for password change
 * @param {Object} user - User object
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logPasswordChange(user, req) {
  await logAction({
    userId: user.id,
    action: 'CHANGE_PASSWORD',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for password reset (forgot password)
 * @param {Object} user - User object
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logPasswordReset(user, req) {
  await logAction({
    userId: user.id,
    action: 'PASSWORD_RESET',
    entityType: 'user',
    entityId: user.id,
    req
  });
}

/**
 * Create audit log for profile update
 * @param {Object} user - User object
 * @param {Object} oldData - Previous profile data (excluding sensitive fields)
 * @param {Object} newData - Updated profile data
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function logProfileUpdate(user, oldData, newData, req) {
  await logAction({
    userId: user.id,
    action: 'UPDATE_PROFILE',
    entityType: 'user',
    entityId: user.id,
    oldData,
    newData,
    req
  });
}

module.exports = {
  logAction,
  logLogin,
  logLogout,
  logRegistration,
  logOtpVerification,
  logPasswordChange,
  logPasswordReset,
  logProfileUpdate
};