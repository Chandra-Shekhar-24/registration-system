/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Custom validation functions for input data; used alongside Joi for additional checks.
*/

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate mobile number (10-15 digits, numbers only)
 * @param {string} mobile - Mobile number
 * @returns {boolean} True if valid
 */
function isValidMobile(mobile) {
  const mobileRegex = /^\d{10,15}$/;
  return mobileRegex.test(mobile);
}

/**
 * Validate password strength:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
function isStrongPassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate age (18-120)
 * @param {number} age - Age to validate
 * @returns {boolean} True if valid
 */
function isValidAge(age) {
  return typeof age === 'number' && age >= 18 && age <= 120;
}

/**
 * Validate gender against allowed values
 * @param {string} gender - Gender value
 * @returns {boolean} True if valid
 */
function isValidGender(gender) {
  const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  return allowedGenders.includes(gender);
}

/**
 * Validate name (2-100 characters, no special characters except space and hyphen)
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid
 */
function isValidName(name) {
  const nameRegex = /^[a-zA-Z\s\-']{2,100}$/;
  return nameRegex.test(name);
}

/**
 * Validate OTP format (6-digit numeric)
 * @param {string} otp - OTP code
 * @returns {boolean} True if valid
 */
function isValidOtp(otp) {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
}

/**
 * Sanitize input to prevent XSS (basic)
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  isValidEmail,
  isValidMobile,
  isStrongPassword,
  isValidAge,
  isValidGender,
  isValidName,
  isValidOtp,
  sanitizeInput
};