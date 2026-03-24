/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for OTP verifications table; manages OTP creation, validation, and cleanup.
*/

const { pool } = require('../config/database');
const config = require('../config/env');

class OtpModel {
  /**
   * Create a new OTP record
   * @param {Object} otpData - OTP details
   * @param {string} otpData.email - User email
   * @param {string} otpData.otpCode - 6-digit OTP
   * @param {string} otpData.otpType - Type: registration, password_reset, login
   * @returns {Promise<Object>} Created OTP record
   */
  static async create(otpData) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

    const query = `
      INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, otp_code, otp_type, expires_at, is_used, attempts, created_at
    `;
    const values = [
      otpData.email,
      otpData.otpCode,
      otpData.otpType,
      expiresAt
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a valid (unused, non-expired) OTP by email and type
   * @param {string} email - User email
   * @param {string} otpCode - OTP code
   * @param {string} otpType - OTP type
   * @returns {Promise<Object|null>} OTP record or null
   */
  static async findValidOtp(email, otpCode, otpType) {
    const query = `
      SELECT id, email, otp_code, otp_type, expires_at, is_used, attempts
      FROM otp_verifications
      WHERE email = $1
        AND otp_code = $2
        AND otp_type = $3
        AND is_used = false
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [email, otpCode, otpType]);
    return result.rows[0] || null;
  }

  /**
   * Mark OTP as used
   * @param {string} otpId - OTP record UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAsUsed(otpId) {
    const query = `
      UPDATE otp_verifications
      SET is_used = true
      WHERE id = $1
    `;
    const result = await pool.query(query, [otpId]);
    return result.rowCount > 0;
  }

  /**
   * Increment attempt counter for an OTP
   * @param {string} otpId - OTP record UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async incrementAttempts(otpId) {
    const query = `
      UPDATE otp_verifications
      SET attempts = attempts + 1
      WHERE id = $1
    `;
    const result = await pool.query(query, [otpId]);
    return result.rowCount > 0;
  }

  /**
   * Delete expired OTPs (cleanup)
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteExpired() {
    const query = `
      DELETE FROM otp_verifications
      WHERE expires_at <= CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }

  /**
   * Delete all OTPs for a given email and type (e.g., before sending new)
   * @param {string} email - User email
   * @param {string} otpType - OTP type
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteByEmailAndType(email, otpType) {
    const query = `
      DELETE FROM otp_verifications
      WHERE email = $1 AND otp_type = $2
    `;
    const result = await pool.query(query, [email, otpType]);
    return result.rowCount;
  }
}

module.exports = OtpModel;