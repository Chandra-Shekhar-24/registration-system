/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Server entry point; initializes database connection and starts Express server.
*/

const app = require('./app');
const { testConnection, closePool } = require('./config/database');
const config = require('./config/env');

const PORT = config.port;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  try {
    await closePool();
    console.log('Database connections closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Test database connection before starting server
    await testConnection();
    console.log('Database connection established');

    const server = app.listen(PORT, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the application
startServer();