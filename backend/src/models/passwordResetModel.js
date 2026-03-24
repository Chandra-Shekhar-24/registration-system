/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for password_resets table; manages password reset tokens.
*/

const { pool } = require('../config/database');
const config = require('../config/env');

class PasswordResetModel {
  /**
   * Create a password reset token
   * @param {Object} data - Reset token details
   * @param {string} data.userId - User UUID
   * @param {string} data.resetToken - Secure token string
   * @returns {Promise<Object>} Created reset record
   */
  static async create(data) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.passwordReset.expiryMinutes);

    const query = `
      INSERT INTO password_resets (user_id, reset_token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, reset_token, expires_at, is_used, created_at
    `;
    const values = [data.userId, data.resetToken, expiresAt];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a valid (unused, non-expired) reset token
   * @param {string} resetToken - Reset token string
   * @returns {Promise<Object|null>} Reset record or null
   */
  static async findValidToken(resetToken) {
    const query = `
      SELECT id, user_id, reset_token, expires_at, is_used, created_at
      FROM password_resets
      WHERE reset_token = $1
        AND is_used = false
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const result = await pool.query(query, [resetToken]);
    return result.rows[0] || null;
  }

  /**
   * Mark token as used after password reset
   * @param {string} tokenId - Reset record UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAsUsed(tokenId) {
    const query = `
      UPDATE password_resets
      SET is_used = true
      WHERE id = $1
    `;
    const result = await pool.query(query, [tokenId]);
    return result.rowCount > 0;
  }

  /**
   * Delete expired tokens (cleanup)
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteExpired() {
    const query = `
      DELETE FROM password_resets
      WHERE expires_at <= CURRENT_TIMESTAMP
         OR is_used = true
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }

  /**
   * Invalidate all reset tokens for a user (e.g., after password change)
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Number of invalidated tokens
   */
  static async invalidateAllForUser(userId) {
    const query = `
      UPDATE password_resets
      SET is_used = true
      WHERE user_id = $1 AND is_used = false
    `;
    const result = await pool.query(query, [userId]);
    return result.rowCount;
  }
}

module.exports = PasswordResetModel;