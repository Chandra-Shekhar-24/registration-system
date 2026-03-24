/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Business logic for OTP generation, validation, and management.
*/

const crypto = require('crypto');
const OtpModel = require('../models/otpModel');
const config = require('../config/env');

/**
 * Generate a random numeric OTP of specified length
 * @param {number} length - Length of OTP (default from config)
 * @returns {string} Numeric OTP string
 */
function generateOtpCode(length = config.otp.length) {
  // Generate random number of appropriate length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = Math.floor(min + Math.random() * (max - min + 1));
  return otp.toString();
}

/**
 * Create and store an OTP for a given email and type
 * @param {string} email - User email
 * @param {string} otpType - Type of OTP (registration, password_reset, login)
 * @returns {Promise<string>} Generated OTP code
 */
async function createOtp(email, otpType) {
  // Delete existing OTPs for this email and type to avoid duplicates
  await OtpModel.deleteByEmailAndType(email, otpType);

  const otpCode = generateOtpCode();
  await OtpModel.create({
    email,
    otpCode,
    otpType
  });

  return otpCode;
}

/**
 * Validate an OTP and mark as used if valid
 * @param {string} email - User email
 * @param {string} otpCode - Provided OTP
 * @param {string} otpType - Expected OTP type
 * @returns {Promise<boolean>} True if OTP is valid and was used
 */
async function validateOtp(email, otpCode, otpType) {
  const otpRecord = await OtpModel.findValidOtp(email, otpCode, otpType);

  if (!otpRecord) {
    return false;
  }

  // Check attempt count (max 3 attempts per OTP)
  if (otpRecord.attempts >= 3) {
    // Mark as used to prevent further attempts
    await OtpModel.markAsUsed(otpRecord.id);
    return false;
  }

  // Increment attempt counter
  await OtpModel.incrementAttempts(otpRecord.id);

  // Mark OTP as used
  await OtpModel.markAsUsed(otpRecord.id);

  return true;
}

/**
 * Check if an OTP exists and is valid without marking it as used
 * (Useful for rate limiting or pre-validation)
 * @param {string} email - User email
 * @param {string} otpCode - Provided OTP
 * @param {string} otpType - Expected OTP type
 * @returns {Promise<boolean>} True if valid (still usable)
 */
async function isOtpValid(email, otpCode, otpType) {
  const otpRecord = await OtpModel.findValidOtp(email, otpCode, otpType);
  return !!otpRecord && otpRecord.attempts < 3;
}

module.exports = {
  generateOtpCode,
  createOtp,
  validateOtp,
  isOtpValid
};