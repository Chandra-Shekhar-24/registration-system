/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Request validation middleware using Joi schemas for all endpoints.
*/

const Joi = require('joi');

// Regular expressions
const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
const mobileRegex = /^[0-9]{10,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // At least one uppercase, one lowercase, one number, min 8 chars

/**
 * Validation schemas for different request bodies
 */
const schemas = {
  // Registration OTP request
  registrationOtp: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().pattern(emailRegex).required(),
    mobile: Joi.string().pattern(mobileRegex).required(),
    age: Joi.number().integer().min(18).max(120).required(),
    gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required(),
    password: Joi.string().pattern(passwordRegex).required()
  }),

  // OTP verification
  verifyOtp: Joi.object({
    email: Joi.string().pattern(emailRegex).required(),
    otp_code: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  // Login
  login: Joi.object({
    email: Joi.string().pattern(emailRegex).required(),
    password: Joi.string().required()
  }),

  // Profile update
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    mobile: Joi.string().pattern(mobileRegex),
    age: Joi.number().integer().min(18).max(120),
    gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say')
  }).min(1),

  // Change password
  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().pattern(passwordRegex).required()
  }),

  // Password reset request
  passwordResetRequest: Joi.object({
    email: Joi.string().pattern(emailRegex).required()
  }),

  // Password reset verify
  passwordResetVerify: Joi.object({
    email: Joi.string().pattern(emailRegex).required(),
    otp_code: Joi.string().length(6).pattern(/^\d+$/).required(),
    new_password: Joi.string().pattern(passwordRegex).required()
  })
};

/**
 * Generic validation middleware factory
 * @param {string} schemaName - Name of schema in schemas object
 * @returns {Function} Express middleware
 */
function validate(schemaName) {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Validation schema '${schemaName}' not found`);
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details
        }
      });
    }

    // Replace request body with validated and stripped value
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  schemas
};