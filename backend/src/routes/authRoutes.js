/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Authentication routes for registration, login, logout, and session management.
*/

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const validationMiddleware = require('../middleware/validationMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes with rate limiting
router.post(
  '/auth/register/request-otp',
  rateLimiter.otpLimiter,
  validationMiddleware.validate('registrationOtp'),
  authController.requestRegistrationOtp
);

router.post(
  '/auth/register/verify-otp',
  validationMiddleware.validate('verifyOtp'),
  authController.verifyRegistrationOtp
);

router.post(
  '/auth/login',
  rateLimiter.loginLimiter,
  validationMiddleware.validate('login'),
  authController.login
);

// Password reset routes
router.post(
  '/auth/password-reset/request',
  rateLimiter.passwordResetLimiter,
  validationMiddleware.validate('passwordResetRequest'),
  passwordController.requestPasswordReset
);

router.post(
  '/auth/password-reset/verify',
  validationMiddleware.validate('passwordResetVerify'),
  passwordController.verifyPasswordReset
);

// Protected routes (require authentication)
router.post(
  '/auth/logout',
  authMiddleware,
  authController.logout
);

router.post(
  '/auth/refresh',
  authMiddleware,
  authController.refreshToken
);

router.get(
  '/auth/sessions',
  authMiddleware,
  authController.getActiveSessions
);

router.delete(
  '/auth/sessions/:sessionId',
  authMiddleware,
  authController.revokeSession
);

module.exports = router;