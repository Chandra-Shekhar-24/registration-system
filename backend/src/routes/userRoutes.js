/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: User profile routes for retrieving and updating profile, and password change.
*/

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validationMiddleware = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// All user routes require authentication
router.use(authMiddleware);

// Apply API rate limiter to all user routes
router.use(rateLimiter.apiLimiter);

// Get current user profile
router.get('/users/me', userController.getProfile);

// Update user profile
router.put(
  '/users/me',
  validationMiddleware.validate('updateProfile'),
  userController.updateProfile
);

// Change password
router.post(
  '/users/me/change-password',
  validationMiddleware.validate('changePassword'),
  userController.changePassword
);

module.exports = router;