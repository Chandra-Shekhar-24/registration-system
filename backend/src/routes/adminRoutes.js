/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Admin routes for user management, audit logs, and email logs with role-based authorization.
*/

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validationMiddleware = require('../middleware/validationMiddleware');

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin role
 * Note: Assumes user object from authMiddleware contains a 'role' field.
 * For simplicity, this example checks if email contains 'admin' or a specific admin flag.
 * In production, use a proper role field in users table.
 */
async function adminAuthMiddleware(req, res, next) {
  try {
    // For demonstration: Check if user has admin role.
    // In a real system, you would have a role column in users table.
    // This is a placeholder; you should implement proper role checking.
    const isAdmin = req.user && (
      req.user.role === 'admin' ||
      req.user.email === 'admin@example.com' // Example admin email
    );
    
    if (!isAdmin) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Authorization failed'
      }
    });
  }
}

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminAuthMiddleware);
router.use(rateLimiter.apiLimiter);

// User management
router.get('/admin/users', adminController.getAllUsers);
router.get('/admin/users/:userId', adminController.getUserById);
router.put('/admin/users/:userId', adminController.updateUser);
router.patch('/admin/users/:userId/status', adminController.updateUserStatus);

// Audit logs
router.get('/admin/audit-logs', adminController.getAuditLogs);

// Email logs
router.get('/admin/email-logs', adminController.getEmailLogs);

module.exports = router;