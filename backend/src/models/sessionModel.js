/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for user_sessions table; manages session creation, validation, and revocation.
*/

const { pool } = require('../config/database');

class SessionModel {
  /**
   * Create a new session record
   * @param {Object} sessionData - Session details
   * @param {string} sessionData.userId - User UUID
   * @param {string} sessionData.token - JWT token string
   * @param {Object} sessionData.deviceInfo - Device information (browser, OS, etc.)
   * @param {string} sessionData.ipAddress - User IP address
   * @param {Date} sessionData.expiresAt - Expiration timestamp
   * @returns {Promise<Object>} Created session object
   */
  static async create(sessionData) {
    const query = `
      INSERT INTO user_sessions (
        user_id, token, device_info, ip_address, expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, token, device_info, ip_address, expires_at,
                is_active, created_at, last_activity
    `;
    const values = [
      sessionData.userId,
      sessionData.token,
      sessionData.deviceInfo || null,
      sessionData.ipAddress,
      sessionData.expiresAt
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find active session by token
   * @param {string} token - JWT token string
   * @returns {Promise<Object|null>} Session object or null
   */
  static async findActiveByToken(token) {
    const query = `
      SELECT id, user_id, token, device_info, ip_address, expires_at,
             is_active, created_at, last_activity
      FROM user_sessions
      WHERE token = $1
        AND is_active = true
        AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Get all active sessions for a user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} List of active sessions
   */
  static async findActiveByUser(userId) {
    const query = `
      SELECT id, token, device_info, ip_address, expires_at, created_at, last_activity
      FROM user_sessions
      WHERE user_id = $1
        AND is_active = true
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Revoke (deactivate) a session
   * @param {string} sessionId - Session UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async revoke(sessionId) {
    const query = `
      UPDATE user_sessions
      SET is_active = false
      WHERE id = $1
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rowCount > 0;
  }

  /**
   * Revoke all active sessions for a user (except optionally one)
   * @param {string} userId - User UUID
   * @param {string|null} exceptSessionId - Session ID to exclude
   * @returns {Promise<number>} Number of revoked sessions
   */
  static async revokeAllByUser(userId, exceptSessionId = null) {
    let query = `
      UPDATE user_sessions
      SET is_active = false
      WHERE user_id = $1
        AND is_active = true
    `;
    const values = [userId];
    if (exceptSessionId) {
      query += ` AND id != $2`;
      values.push(exceptSessionId);
    }
    const result = await pool.query(query, values);
    return result.rowCount;
  }

  /**
   * Update last activity timestamp for a session
   * @param {string} sessionId - Session UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async updateLastActivity(sessionId) {
    const query = `
      UPDATE user_sessions
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rowCount > 0;
  }

  /**
   * Delete expired sessions (cleanup)
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteExpired() {
    const query = `
      DELETE FROM user_sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
         OR (is_active = false AND last_activity < (CURRENT_TIMESTAMP - INTERVAL '30 days'))
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = SessionModel;