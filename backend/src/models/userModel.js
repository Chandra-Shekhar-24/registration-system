/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for users table; provides CRUD operations with parameterized queries.
*/

const { pool } = require('../config/database');

/**
 * User model class containing static methods for database operations.
 * All methods use parameterized queries to prevent SQL injection.
 */
class UserModel {
  /**
   * Create a new user (pending verification)
   * @param {Object} userData - User details
   * @param {string} userData.name - Full name
   * @param {string} userData.email - Email address
   * @param {string} userData.mobileNumber - Mobile number
   * @param {number} userData.age - Age (18-120)
   * @param {string} userData.gender - Gender from allowed list
   * @param {string} userData.username - Auto-generated username
   * @param {string} userData.passwordHash - Bcrypt hash
   * @returns {Promise<Object>} Created user object (excluding password)
   */
  static async create(userData) {
    const query = `
      INSERT INTO users (
        name, email, mobile_number, age, gender, username, password_hash, is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, email, mobile_number, age, gender, username, is_verified, created_at
    `;
    const values = [
      userData.name,
      userData.email,
      userData.mobileNumber,
      userData.age,
      userData.gender,
      userData.username,
      userData.passwordHash,
      false // is_verified initially false
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByEmail(email) {
    const query = `
      SELECT id, name, email, mobile_number, age, gender, username,
             password_hash, is_verified, is_active, last_login, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find a user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByUsername(username) {
    const query = `
      SELECT id, name, email, mobile_number, age, gender, username,
             password_hash, is_verified, is_active, last_login, created_at, updated_at
      FROM users
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find a user by ID
   * @param {string} id - UUID of user
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const query = `
      SELECT id, name, email, mobile_number, age, gender, username,
             is_verified, is_active, last_login, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if email already exists (for duplicate validation)
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if exists
   */
  static async emailExists(email) {
    const query = 'SELECT 1 FROM users WHERE email = $1 LIMIT 1';
    const result = await pool.query(query, [email]);
    return result.rowCount > 0;
  }

  /**
   * Check if mobile number already exists
   * @param {string} mobileNumber - Mobile number
   * @returns {Promise<boolean>} True if exists
   */
  static async mobileExists(mobileNumber) {
    const query = 'SELECT 1 FROM users WHERE mobile_number = $1 LIMIT 1';
    const result = await pool.query(query, [mobileNumber]);
    return result.rowCount > 0;
  }

  /**
   * Check if username already exists
   * @param {string} username - Username
   * @returns {Promise<boolean>} True if exists
   */
  static async usernameExists(username) {
    const query = 'SELECT 1 FROM users WHERE username = $1 LIMIT 1';
    const result = await pool.query(query, [username]);
    return result.rowCount > 0;
  }

  /**
   * Update user verification status
   * @param {string} email - User email
   * @returns {Promise<Object>} Updated user
   */
  static async verifyUser(email) {
    const query = `
      UPDATE users
      SET is_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING id, name, email, username, is_verified
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Update user profile (partial update)
   * @param {string} userId - User UUID
   * @param {Object} updates - Fields to update (name, mobile, age, gender)
   * @returns {Promise<Object>} Updated user
   */
  static async updateProfile(userId, updates) {
    const allowedFields = ['name', 'mobile_number', 'age', 'gender'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(updates[field]);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      // No fields to update
      return this.findById(userId);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, email, mobile_number, age, gender, username,
                is_verified, is_active, last_login, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user password
   * @param {string} userId - User UUID
   * @param {string} newPasswordHash - New bcrypt hash
   * @returns {Promise<boolean>} Success indicator
   */
  static async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    const result = await pool.query(query, [newPasswordHash, userId]);
    return result.rowCount > 0;
  }

  /**
   * Record last login timestamp
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await pool.query(query, [userId]);
  }

  /**
   * Soft delete user (deactivate)
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async deactivate(userId) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rowCount > 0;
  }

  /**
   * Reactivate user
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} Success indicator
   */
  static async activate(userId) {
    const query = `
      UPDATE users
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rowCount > 0;
  }
}

module.exports = UserModel;