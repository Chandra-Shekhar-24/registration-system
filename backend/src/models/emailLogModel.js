/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Database queries for email_logs table; tracks all email communications sent to users.
*/

const { pool } = require('../config/database');

class EmailLogModel {
  /**
   * Create an email log entry
   * @param {Object} logData - Email log details
   * @param {string} logData.emailTo - Recipient email address
   * @param {string} logData.emailType - Type: registration, otp, credentials, password_reset, welcome
   * @param {string} logData.subject - Email subject
   * @param {string} logData.content - Email body content
   * @returns {Promise<Object>} Created log entry
   */
  static async create(logData) {
    const query = `
      INSERT INTO email_logs (email_to, email_type, subject, content, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, email_to, email_type, subject, content, status, created_at
    `;
    const values = [
      logData.emailTo,
      logData.emailType,
      logData.subject,
      logData.content
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update email status to sent
   * @param {number} logId - Email log ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAsSent(logId) {
    const query = `
      UPDATE email_logs
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await pool.query(query, [logId]);
    return result.rowCount > 0;
  }

  /**
   * Update email status to failed with error message
   * @param {number} logId - Email log ID
   * @param {string} errorMessage - Error details
   * @returns {Promise<boolean>} Success indicator
   */
  static async markAsFailed(logId, errorMessage) {
    const query = `
      UPDATE email_logs
      SET status = 'failed', error_message = $2
      WHERE id = $1
    `;
    const result = await pool.query(query, [logId, errorMessage]);
    return result.rowCount > 0;
  }

  /**
   * Find email logs with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {string|null} filters.emailTo - Recipient email
   * @param {string|null} filters.emailType - Type of email
   * @param {string|null} filters.status - Status: pending, sent, failed, bounced
   * @param {Date|null} filters.fromDate - Start date
   * @param {Date|null} filters.toDate - End date
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.emailTo) {
      conditions.push(`email_to = $${idx}`);
      values.push(filters.emailTo);
      idx++;
    }
    if (filters.emailType) {
      conditions.push(`email_type = $${idx}`);
      values.push(filters.emailType);
      idx++;
    }
    if (filters.status) {
      conditions.push(`status = $${idx}`);
      values.push(filters.status);
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
      FROM email_logs
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    const dataQuery = `
      SELECT id, email_to, email_type, subject, content, status, error_message,
             sent_at, created_at
      FROM email_logs
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
   * Get pending emails (for retry mechanism)
   * @returns {Promise<Array>} List of pending email logs
   */
  static async getPendingEmails() {
    const query = `
      SELECT id, email_to, email_type, subject, content
      FROM email_logs
      WHERE status = 'pending'
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 100
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Clean up old email logs
   * @param {number} retentionDays - Days to keep
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteOldLogs(retentionDays = 30) {
    const query = `
      DELETE FROM email_logs
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = EmailLogModel;