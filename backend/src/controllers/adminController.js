/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Admin controller for managing users, audit logs, and email logs with role-based access.
*/

const UserModel = require('../models/userModel');
const AuditModel = require('../models/auditModel');
const EmailLogModel = require('../models/emailLogModel');
const auditService = require('../services/auditService');

/**
 * GET /admin/users
 * Get all users with pagination and sorting
 */
async function getAllUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const sort = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'email', 'username', 'created_at', 'last_login'];
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_FIELD',
          message: `Sort field must be one of: ${allowedSortFields.join(', ')}`
        }
      });
    }

    const query = `
      SELECT id, name, email, mobile_number, age, gender, username,
             is_verified, is_active, last_login, created_at, updated_at
      FROM users
      ORDER BY ${sort} ${order}
      LIMIT $1 OFFSET $2
    `;
    const countQuery = 'SELECT COUNT(*)::int as total FROM users';

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = countResult.rows[0].total;

    await auditService.logAction({
      userId: req.user.id,
      action: 'ADMIN_LIST_USERS',
      entityType: 'user',
      newData: { page, limit, sort, order },
      req
    });

    return res.status(200).json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    next(error);
  }
}

/**
 * GET /admin/users/:userId
 * Get user details by ID
 */
async function getUserById(req, res, next) {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    await auditService.logAction({
      userId: req.user.id,
      action: 'ADMIN_VIEW_USER',
      entityType: 'user',
      entityId: userId,
      req
    });

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
    next(error);
  }
}

/**
 * PUT /admin/users/:userId
 * Update user details (admin override)
 */
async function updateUser(req, res, next) {
  try {
    const userId = req.params.userId;
    const { name, mobile, age, gender, is_active } = req.body;

    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) updates.mobile_number = mobile;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;

    let updatedUser = null;
    if (Object.keys(updates).length > 0) {
      updatedUser = await UserModel.updateProfile(userId, updates);
    } else {
      updatedUser = currentUser;
    }

    // Handle status update separately
    if (is_active !== undefined && is_active !== currentUser.is_active) {
      if (is_active) {
        await UserModel.activate(userId);
        updatedUser.is_active = true;
      } else {
        await UserModel.deactivate(userId);
        updatedUser.is_active = false;
      }
    }

    await auditService.logAction({
      userId: req.user.id,
      action: 'ADMIN_UPDATE_USER',
      entityType: 'user',
      entityId: userId,
      oldData: {
        name: currentUser.name,
        mobile: currentUser.mobile_number,
        age: currentUser.age,
        gender: currentUser.gender,
        is_active: currentUser.is_active
      },
      newData: {
        name: updatedUser.name,
        mobile: updatedUser.mobile_number,
        age: updatedUser.age,
        gender: updatedUser.gender,
        is_active: updatedUser.is_active
      },
      req
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    next(error);
  }
}

/**
 * PATCH /admin/users/:userId/status
 * Deactivate/activate user
 */
async function updateUserStatus(req, res, next) {
  try {
    const userId = req.params.userId;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELD',
          message: 'is_active field is required'
        }
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    let success;
    if (is_active) {
      success = await UserModel.activate(userId);
    } else {
      success = await UserModel.deactivate(userId);
    }

    if (!success) {
      throw new Error('Failed to update user status');
    }

    await auditService.logAction({
      userId: req.user.id,
      action: is_active ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER',
      entityType: 'user',
      entityId: userId,
      oldData: { is_active: user.is_active },
      newData: { is_active },
      req
    });

    return res.status(200).json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    next(error);
  }
}

/**
 * GET /admin/audit-logs
 * Get audit logs with filters and pagination
 */
async function getAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { user_id, action, entity_type, entity_id, from, to } = req.query;

    const filters = {
      userId: user_id || null,
      action: action || null,
      entityType: entity_type || null,
      entityId: entity_id || null,
      fromDate: from ? new Date(from) : null,
      toDate: to ? new Date(to) : null
    };

    const logs = await AuditModel.findAll(filters, page, limit);

    await auditService.logAction({
      userId: req.user.id,
      action: 'ADMIN_VIEW_AUDIT_LOGS',
      entityType: 'audit',
      newData: { filters, page, limit },
      req
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    next(error);
  }
}

/**
 * GET /admin/email-logs
 * Get email logs with filters and pagination
 */
async function getEmailLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { email, type, status, from, to } = req.query;

    const filters = {
      emailTo: email || null,
      emailType: type || null,
      status: status || null,
      fromDate: from ? new Date(from) : null,
      toDate: to ? new Date(to) : null
    };

    const logs = await EmailLogModel.findAll(filters, page, limit);

    await auditService.logAction({
      userId: req.user.id,
      action: 'ADMIN_VIEW_EMAIL_LOGS',
      entityType: 'email_log',
      newData: { filters, page, limit },
      req
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Get email logs error:', error);
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getAuditLogs,
  getEmailLogs
};