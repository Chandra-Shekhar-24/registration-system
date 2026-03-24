/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: PostgreSQL connection pool configuration with health check and graceful shutdown.
*/

const { Pool } = require('pg');
const config = require('./env');

// Database connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  connectionTimeoutMillis: config.db.connectionTimeoutMillis
});

/**
 * Event handlers for pool errors and connection management
 */
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // In production, consider sending alerts here
});

pool.on('connect', () => {
  if (config.nodeEnv === 'development') {
    console.log('Database pool: new client connected');
  }
});

/**
 * Test database connection on startup
 */
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`Database connected: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
}

/**
 * Gracefully close all connections (for shutdown hooks)
 */
async function closePool() {
  try {
    await pool.end();
    console.log('Database pool closed gracefully');
  } catch (err) {
    console.error('Error closing database pool:', err);
    throw err;
  }
}

module.exports = {
  pool,
  testConnection,
  closePool
};