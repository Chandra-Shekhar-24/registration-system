/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Password reset controller - handles forgot password OTP request and reset verification.
*/

const UserModel = require('../models/userModel');
const { hashPassword } = require('../utils/bcrypt');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');

/**
 * POST /auth/password-reset/request
 * Request password reset OTP
 */
async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;

    // Check if user exists and is verified (do not reveal existence to prevent enumeration)
    const user = await UserModel.findByEmail(email);
    if (user && user.is_verified) {
      // Generate OTP
      const otpCode = await otpService.createOtp(email, 'password_reset');
      
      // Send OTP email
      await emailService.sendPasswordResetEmail(email, otpCode);
      
      // Log action
      await auditService.logAction({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'user',
        entityId: user.id,
        req
      });
    }
    
    // Always return same message to prevent user enumeration
    return res.status(200).json({
      message: 'If account exists and is verified, a reset OTP has been sent to your email'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    next(error);
  }
}

/**
 * POST /auth/password-reset/verify
 * Verify OTP and set new password
 */
async function verifyPasswordReset(req, res, next) {
  try {
    const { email, otp_code, new_password } = req.body;

    // Validate OTP
    const isValid = await otpService.validateOtp(email, otp_code, 'password_reset');
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        }
      });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user || !user.is_verified) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or not verified'
        }
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    const updated = await UserModel.updatePassword(user.id, newPasswordHash);
    if (!updated) {
      throw new Error('Failed to update password');
    }

    // Log password reset
    await auditService.logPasswordReset(user, req);

    // Optionally invalidate all active sessions for security
    // await SessionModel.revokeAllByUser(user.id);

    return res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Password reset verification error:', error);
    next(error);
  }
}

module.exports = {
  requestPasswordReset,
  verifyPasswordReset
};