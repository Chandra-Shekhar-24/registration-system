/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for audit_logs table; records user actions and provides retrieval methods.
*/

const { pool } = require('../config/database');

class AuditModel {
  /**
   * Create an audit log entry
   * @param {Object} logData - Audit log details
   * @param {string|null} logData.userId - User UUID (null if anonymous)
   * @param {string} logData.action - Action performed (e.g., LOGIN, REGISTER)
   * @param {string|null} logData.entityType - Type of affected entity
   * @param {string|null} logData.entityId - Identifier of affected entity
   * @param {Object|null} logData.oldData - Previous state (JSON)
   * @param {Object|null} logData.newData - New state (JSON)
   * @param {string|null} logData.ipAddress - IP address of request
   * @param {string|null} logData.userAgent - User agent string
   * @returns {Promise<Object>} Created audit log entry
   */
  static async create(logData) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, action, entity_type, entity_id, old_data, new_data,
                ip_address, user_agent, created_at
    `;
    const values = [
      logData.userId || null,
      logData.action,
      logData.entityType || null,
      logData.entityId || null,
      logData.oldData || null,
      logData.newData || null,
      logData.ipAddress || null,
      logData.userAgent || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Retrieve audit logs with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {string|null} filters.userId - Filter by user
   * @param {string|null} filters.action - Filter by action type
   * @param {string|null} filters.entityType - Filter by entity type
   * @param {string|null} filters.entityId - Filter by entity ID
   * @param {Date|null} filters.fromDate - Start date
   * @param {Date|null} filters.toDate - End date
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${idx}`);
      values.push(filters.userId);
      idx++;
    }
    if (filters.action) {
      conditions.push(`action = $${idx}`);
      values.push(filters.action);
      idx++;
    }
    if (filters.entityType) {
      conditions.push(`entity_type = $${idx}`);
      values.push(filters.entityType);
      idx++;
    }
    if (filters.entityId) {
      conditions.push(`entity_id = $${idx}`);
      values.push(filters.entityId);
      idx++;
    }
    if (filters.fromDate) {
      conditions.push(`created_at >= $${idx}`);
      values.push(filters.fromDate);
      idx++;
    }
    if (filters.toDate) {
      conditions.push(`created_at <= $${idx}`);
      values.push(filters.toDate);
      idx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM audit_logs
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    const dataQuery = `
      SELECT id, user_id, action, entity_type, entity_id, old_data, new_data,
             ip_address, user_agent, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs for a specific user with pagination
   * @param {string} userId - User UUID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  static async findByUser(userId, page = 1, limit = 20) {
    return this.findAll({ userId }, page, limit);
  }

  /**
   * Get audit logs by action type
   * @param {string} action - Action name
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  static async findByAction(action, page = 1, limit = 20) {
    return this.findAll({ action }, page, limit);
  }

  /**
   * Clean up old audit logs (older than retention period)
   * @param {number} retentionDays - Number of days to keep
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteOldLogs(retentionDays = 90) {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = AuditModel;