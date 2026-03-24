/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: User profile management controller - get profile, update profile, change password.
*/

const UserModel = require('../models/userModel');
const { comparePassword, hashPassword } = require('../utils/bcrypt');
const auditService = require('../services/auditService');

/**
 * GET /users/me
 * Get current authenticated user profile
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
}

/**
 * PUT /users/me
 * Update user profile (partial update)
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Get current user data for audit trail
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prepare update data (only allowed fields)
    const updates = {};
    const allowedFields = ['name', 'mobile', 'age', 'gender'];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Map 'mobile' to 'mobile_number' for database
        if (field === 'mobile') {
          updates.mobile_number = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // If no fields to update, return current user
    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        message: 'No changes provided',
        user: currentUser
      });
    }

    // Check if mobile number is being updated and is unique
    if (updates.mobile_number && updates.mobile_number !== currentUser.mobile_number) {
      const mobileExists = await UserModel.mobileExists(updates.mobile_number);
      if (mobileExists) {
        return res.status(409).json({
          error: {
            code: 'MOBILE_EXISTS',
            message: 'Mobile number already in use'
          }
        });
      }
    }

    // Perform update
    const updatedUser = await UserModel.updateProfile(userId, updates);
    
    // Log profile update with old and new data (excluding sensitive fields)
    const oldData = {
      name: currentUser.name,
      mobile: currentUser.mobile_number,
      age: currentUser.age,
      gender: currentUser.gender
    };
    const newData = {
      name: updatedUser.name,
      mobile: updatedUser.mobile_number,
      age: updatedUser.age,
      gender: updatedUser.gender
    };
    
    await auditService.logProfileUpdate(
      { id: userId },
      oldData,
      newData,
      req
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
}

/**
 * POST /users/me/change-password
 * Change user password
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get user with password hash
    const user = await UserModel.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify current password
    const isMatch = await comparePassword(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    const updated = await UserModel.updatePassword(userId, newPasswordHash);
    if (!updated) {
      throw new Error('Failed to update password');
    }

    // Log password change
    await auditService.logPasswordChange({ id: userId }, req);

    return res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};